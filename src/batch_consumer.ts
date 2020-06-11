import { promisify } from "util"
import { EventEmitter } from "events"
import * as rdkafka from "node-rdkafka"
import merge from "lodash.merge"
import maxExponential from "./utils/maxExponential"

import StrictEventEmitter from "strict-event-emitter-types"
import { KafkaMessage } from "./message"
import { KafkaTopicProcessor } from "./topic_processor"
import { KafkaError } from "./kafka_error"
import { inferActualType } from "./utils/ts_infer_actual"

export class KafkaBatchConsumer extends (EventEmitter as new () => TypedEmitter) {
  static eventNames: Array<keyof KafkaBatchConsumerEvents> = [
    "ready",
    "disconnected",
    "error",
    "consuming",
    "polling",
    "offsetCommit",
    "rawBatch",
    "batch",
    "batchesProcessed",
    "emptyBatchDelay",
    "invalidMessage",
  ]

  readonly name: string
  readonly kafkaConfig: rdkafka.ConsumerGlobalConfig
  readonly topicConfig: rdkafka.ConsumerTopicConfig
  readonly topics: string[]
  readonly processorMap: { [topic: string]: KafkaTopicProcessor<any, any> }
  readonly consumer: RdkafkaConsumer
  readonly batchSize: number
  readonly maxEmptyBatchDelayMs: number
  private consuming: boolean
  private polling: boolean
  private pollTimeout: NodeJS.Timeout | null
  private precedingEmptyBatches: number

  constructor(
    config: KafkaBatchConsumerConfig,
    rdkafkaConsumer?: RdkafkaConsumer,
  ) {
    super()
    const finalConfig = this.finalizeConfig(config)
    this.name = finalConfig.name
    this.kafkaConfig = finalConfig.kafkaConfig
    this.topicConfig = finalConfig.topicConfig
    this.batchSize = finalConfig.batchSize
    this.maxEmptyBatchDelayMs = finalConfig.maxEmptyBatchDelayMs
    this.topics = []
    this.processorMap = {}
    this.consumer =
      rdkafkaConsumer ||
      new rdkafka.KafkaConsumer(this.kafkaConfig, this.topicConfig)
    this.addConsumerEventListener()
    this.consuming = false
    // polling state
    this.polling = false
    this.pollTimeout = null
    this.precedingEmptyBatches = 0
  }

  private addConsumerEventListener() {
    this.consumer.on("ready", (info, metadata) => {
      this.emit("ready", info, metadata)
    })
    this.consumer.on("disconnected", () => {
      this.emit("disconnected")
    })
    this.consumer.on("event.error", err => {
      this.emit(
        "error",
        KafkaError.fromUnknownError(err, "consumer_error_event"),
      )
    })
    this.consumer.on("offset.commit", this.offsetCommitListener.bind(this))
  }

  private finalizeConfig(config: KafkaBatchConsumerConfig): FinalConfig {
    const defaults = inferActualType<Partial<FinalConfig>>()({
      name: "default",
      batchSize: 128,
      maxEmptyBatchDelayMs: 256,
    })
    const overrideKafkaConfig = inferActualType<FinalConfig["kafkaConfig"]>()({
      "enable.auto.offset.store": true, // enable offset store
      "enable.auto.commit": false, // but do not commit automatically
      "api.version.request": true,
      offset_commit_cb: true,
    })
    return merge({}, defaults, config, { kafkaConfig: overrideKafkaConfig })
  }

  connect(
    metadataOptions?: rdkafka.MetadataOptions,
  ): Promise<rdkafka.Metadata> {
    return promisify(this.consumer.connect).call(this.consumer, metadataOptions)
  }

  disconnect(): Promise<any> {
    this.stopConsuming()
    return promisify(this.consumer.disconnect).call(this.consumer)
  }

  isConnected(): boolean {
    return this.consumer.isConnected()
  }

  addTopic<Body, Key>(processor: KafkaTopicProcessor<Body, Key>): void {
    if (this.topics.includes(processor.topic)) {
      throw new Error(
        `TopicProcessor for topic '${processor.topic}' does already exist`,
      )
    }
    this.processorMap[processor.topic] = processor
    this.topics.push(processor.topic)
    if (this.isConnected()) {
      this.consumer.unsubscribe().subscribe(this.topics)
    }
  }

  async removeTopic(topic: string, disconnectIfNoneLeft = true): Promise<void> {
    delete this.processorMap[topic]
    const index = this.topics.indexOf(topic)
    if (index !== -1) {
      this.topics.splice(index, 1)
    }
    if (this.topics.length === 0 && disconnectIfNoneLeft) {
      await this.disconnect()
    }
  }

  commitCurrentOffsets(): void {
    this.consumer.commit()
  }

  startConsuming(): boolean {
    if (!this.isConnected()) {
      throw new Error("Consumer is not connected")
    }
    if (this.consuming) {
      return false
    }
    this.consuming = true
    this.emit("consuming", true)
    return this.startPolling()
  }

  stopConsuming(): boolean {
    if (!this.consuming) {
      return false
    }
    this.stopPolling()
    this.consuming = false
    this.emit("consuming", false)
    return true
  }

  isConsuming(): boolean {
    return this.consuming
  }

  async nextTopicBatch<Body = unknown, Key = unknown>(
    topic: string,
  ): Promise<Batch<Body, Key>> {
    if (!this.isConnected()) {
      throw new Error("Consumer is not connected")
    }
    if (!this.consuming) {
      throw new Error("Consumer is not consuming")
    }
    if (!this.topics.includes(topic)) {
      throw new Error(
        `Can't wait for next batch of topic ${topic} because it is not consumed`,
      )
    }
    let listener: (batch: Batch<Body, Key>) => void
    const batch = await new Promise<Batch<Body, Key>>(resolve => {
      listener = batch => {
        if (batch.topic === topic) {
          resolve(batch)
        }
      }
      this.on("batch", listener)
    })
    this.removeListener("batch", listener!)
    return batch
  }

  private startPolling(): boolean {
    // do nothing if we are already polling batches
    if (this.polling) {
      return false
    }
    // init polling state
    this.polling = true
    this.emit("polling", true)
    this.precedingEmptyBatches = 0
    this.pollRawBatch()
    return true
  }

  private stopPolling(): boolean {
    if (!this.polling) {
      return false
    }
    // reset polling state
    this.polling = false
    this.emit("polling", false)
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout)
      this.pollTimeout = null
    }
    return true
  }

  private pollRawBatch = (): void => {
    this.consumer.consume(this.batchSize, this.processRawBatchCallback)
  }

  private rawBatchDone(processedBatches: Batch<unknown, unknown>[]) {
    this.emit("batchesProcessed", processedBatches)
    if (!this.isConnected()) {
      this.stopConsuming()
      return
    }
    this.commitCurrentOffsets()
    this.startPolling()
  }

  private rawBatchError = (err: unknown) => {
    this.emit("error", KafkaError.fromUnknownError(err, "processor"))
  }

  private processRawBatchCallback = (
    err: unknown,
    rawBatch: rdkafka.Message[] | null | undefined,
  ): void => {
    if (err) {
      // TODO: maybe retry?
      this.emit("error", KafkaError.fromUnknownError(err, "consume"))
      return
    }
    if (!this.consuming) {
      // stop processing if consuming has been switched off
      return
    }
    if (!Array.isArray(rawBatch)) {
      const err = new KafkaError(
        "Consumed batch is not an array",
        "NON_ARRAY_BATCH",
        "consume",
      )
      this.emit("error", err)
      return
    }
    this.emit("rawBatch", rawBatch)
    // init next poll and return if the batch is empty
    if (rawBatch.length < 1) {
      const delay = maxExponential(
        this.maxEmptyBatchDelayMs,
        this.precedingEmptyBatches++,
        2,
      )
      this.emit("emptyBatchDelay", delay)
      this.pollTimeout = setTimeout(this.pollRawBatch, delay)
      return
    }
    this.stopPolling()

    const topicBatchMap: {
      [topic: string]: TopicBatch<any, any>
    } = {}
    const partitionBatchMap: {
      [topic: string]: { [partition: string]: PartitionBatch<any, any> }
    } = {}
    // init objects for batch splitting
    for (const topic of this.topics) {
      if (this.processorMap[topic].level === "topic") {
        topicBatchMap[topic] = {
          topic,
          messages: [],
          partition: null,
          partitionStats: {},
        }
      } else {
        // => level === "partition"
        partitionBatchMap[topic] = {}
      }
    }
    // deserialize messages and split raw batch into batches
    for (const rawMsg of rawBatch) {
      const { topic, partition, offset } = rawMsg
      const topicConfig = this.processorMap[topic]
      // we could receive messages of deleted topics => skip them
      if (topicConfig === undefined) {
        continue
      }
      const msg: KafkaMessage<unknown, unknown> = {
        key:
          rawMsg.key != null
            ? topicConfig.keyDeserializer(rawMsg.key, topic)
            : rawMsg.key,
        body:
          rawMsg.value !== null
            ? topicConfig.bodyDeserializer(rawMsg.value, topic)
            : rawMsg,
        topic,
        partition,
        offset,
        size: rawMsg.size,
      }
      const batch = this.createOrUpdateBatch(
        topicBatchMap,
        partitionBatchMap,
        topic,
        partition,
      )
      const partitionStats = batch.partitionStats[partition]
      if (offset + 1 > partitionStats.offset) {
        partitionStats.offset = offset + 1
      }
      if (topicConfig.bodyValidation.func(msg.body)) {
        batch.messages.push(msg)
        partitionStats.messageCount += 1
      } else {
        this.emit("invalidMessage", msg)
        topicConfig.bodyValidation.onInvalidMessage(msg)
      }
    }
    // process topic-level batches
    const { processPromises, processedBatches } = this.processBatches(
      Object.values(topicBatchMap),
    )
    // process partition-level batches
    for (const partitionMap of Object.values(partitionBatchMap)) {
      const {
        processPromises: _processPromises,
        processedBatches: _processedBatches,
      } = this.processBatches(Object.values(partitionMap))
      processPromises.push(..._processPromises)
      processedBatches.push(..._processedBatches)
    }
    Promise.all(processPromises).then(
      () => this.rawBatchDone(processedBatches),
      this.rawBatchError,
    )
  }

  private offsetCommitListener(
    err: Error | undefined,
    offsetCommits: rdkafka.TopicPartitionOffset[],
  ) {
    if (err) {
      this.emit("error", KafkaError.fromUnknownError(err, "offset_commit"))
    } else {
      const filteredOffsetCommits = offsetCommits.filter(
        KafkaBatchConsumer.isOffsetCommitWithOffset,
      )
      if (filteredOffsetCommits.length > 0) {
        this.emit("offsetCommit", filteredOffsetCommits)
      }
    }
  }

  private createOrUpdateBatch(
    topicBatchMap: { [topic: string]: TopicBatch<any, any> },
    partitionBatchMap: {
      [topic: string]: { [partition: string]: PartitionBatch<any, any> }
    },
    topic: string,
    partition: number,
  ): Batch<any, any> {
    if (this.processorMap[topic].level === "topic") {
      const topicBatch = topicBatchMap[topic]
      this.createOrUpdatePartitionStats(topicBatch, topic, partition)
      return topicBatch
    } else {
      // level === 'partition'
      let partitionBatch: PartitionBatch<any, any>
      if (partitionBatchMap[topic].hasOwnProperty(partition)) {
        partitionBatch = partitionBatchMap[topic][partition]
      } else {
        partitionBatch = {
          topic,
          messages: [],
          partition,
          partitionStats: {},
        }
        partitionBatchMap[topic][partition] = partitionBatch
      }
      this.createOrUpdatePartitionStats(partitionBatch, topic, partition)
      return partitionBatch
    }
  }

  private createOrUpdatePartitionStats(
    batch: Batch<any, any>,
    topic: string,
    partition: number,
  ): PartitionStats {
    if (batch.partitionStats.hasOwnProperty(partition)) {
      // update existing report
      const partitionReport = batch.partitionStats[partition]
      return partitionReport
    } else {
      // create new report
      const partitionReport = {
        topic,
        partition,
        offset: -1,
        messageCount: 0,
      }
      batch.partitionStats[partition] = partitionReport
      return partitionReport
    }
  }

  private processBatches(batches: Array<Batch<unknown, unknown>>) {
    const processedBatches: Array<Batch<unknown, unknown>> = []
    const processPromises: Array<Promise<unknown>> = []
    for (const batch of batches) {
      if (batch.messages.length === 0) {
        continue
      }
      processedBatches.push(batch)
      processPromises.push(this.processorMap[batch.topic].processor(batch))
      this.emit("batch", batch)
    }
    return { processedBatches, processPromises }
  }

  private static isOffsetCommitWithOffset(
    offsetCommit: rdkafka.TopicPartitionOffset,
  ): boolean {
    return typeof offsetCommit.offset === "number"
  }
}

export interface Batch<Body, Key> {
  messages: Array<KafkaMessage<Body, Key>>
  topic: string
  partition: number | null
  partitionStats: { [partition: number]: PartitionStats }
}

export interface TopicBatch<Body, Key> extends Batch<Body, Key> {
  partition: null
}

export interface PartitionBatch<Body, Key> extends Batch<Body, Key> {
  partition: number
}

export interface PartitionStats {
  topic: string
  partition: number
  offset: number
  messageCount: number
}

export interface KafkaBatchConsumerConfig {
  name?: string
  kafkaConfig: rdkafka.ConsumerGlobalConfig
  topicConfig: rdkafka.ConsumerTopicConfig
  batchSize?: number
  maxEmptyBatchDelayMs?: number
}

interface FinalConfig extends KafkaBatchConsumerConfig {
  name: string
  batchSize: number
  maxEmptyBatchDelayMs: number
}

export interface KafkaBatchConsumerEvents {
  ready: (info: rdkafka.ReadyInfo, metadata: rdkafka.Metadata) => void
  disconnected: void
  error: (err: KafkaError) => void
  consuming: boolean
  polling: boolean
  offsetCommit: rdkafka.TopicPartitionOffset[]
  rawBatch: rdkafka.Message[]
  batch: Batch<any, any>
  batchesProcessed: Array<Batch<any, any>>
  emptyBatchDelay: number
  invalidMessage: KafkaMessage<any, any>
}
type TypedEmitter = StrictEventEmitter<EventEmitter, KafkaBatchConsumerEvents>

export type RdkafkaConsumer = rdkafka.KafkaConsumer
