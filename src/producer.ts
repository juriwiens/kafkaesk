import { promisify } from "util"
import { EventEmitter } from "events"
import * as rdkafka from "node-rdkafka"
import merge from "lodash.merge"
import { identity } from "./utils/identity"

import StrictEventEmitter from "strict-event-emitter-types"
import { BodySerializer, KeySerializer } from "./serializer"
import { KeyGenerator } from "./key_generator"
import { Partitioner } from "./partitioner"

export class KafkaProducer<
  Body = any,
  Key = any
> extends (EventEmitter as new () => TypedEmitter) {
  readonly name: string
  readonly producerConfig: rdkafka.ProducerGlobalConfig
  readonly topicConfig: rdkafka.ProducerTopicConfig
  readonly bodySerializer: BodySerializer<Body>
  readonly keyGenerator: KeyGenerator<Body, Key>
  readonly keySerializer: KeySerializer<Key>
  readonly partitioner: Partitioner<Body, Key>
  readonly producer: rdkafka.HighLevelProducer
  private _producePromisified: (
    topic: string,
    partition: number | null | undefined,
    message: rdkafka.MessageValue,
    key: rdkafka.MessageKey,
    timestamp: number | null | undefined,
  ) => Promise<number | null | undefined>

  constructor(config: KafkaProducerConfig<Body, Key>) {
    super()
    const finalConfig = KafkaProducer.finalizeConfig(config)
    this.name = finalConfig.name
    this.producerConfig = finalConfig.kafkaConfig
    this.topicConfig = finalConfig.topicConfig
    this.bodySerializer = finalConfig.bodySerializer
    this.keyGenerator = finalConfig.keyGenerator
    this.keySerializer = finalConfig.keySerializer
    this.partitioner = finalConfig.partitioner

    this.producer = new rdkafka.HighLevelProducer(
      this.producerConfig,
      this.topicConfig,
    )
    this._producePromisified = promisify(this.producer.produce).bind(
      this.producer,
    ) as KafkaProducer["_producePromisified"]
    this.producer.on("ready", (info, metadata) =>
      this.emit("ready", info, metadata),
    )
    this.producer.on("event.error", err =>
      this.emit("error", err, "producer_err"),
    )
    this.producer.on("delivery-report", (err, report) =>
      this.emit("deliveryReport", err, report),
    )
    this.producer.setValueSerializer(identity as any)
    this.producer.setKeySerializer(identity as any)
  }

  connect(metadataOptions?: any): Promise<any> {
    return promisify(this.producer.connect).call(this.producer, metadataOptions)
  }

  disconnect(): Promise<any> {
    return promisify(this.producer.disconnect).call(this.producer)
  }

  isConnected(): boolean {
    return this.producer.isConnected()
  }

  produce(
    topic: string,
    body: Body,
    key: Key | null,
  ): Promise<number | null | undefined> {
    const _key = key != null ? key : this.keyGenerator(body, topic)
    return this._producePromisified(
      topic,
      this.partitioner(body, _key, topic),
      this.bodySerializer(body, topic),
      this.keySerializer(_key, topic),
      Date.now(),
    )
  }

  private static finalizeConfig<Body, Key>(
    config: KafkaProducerConfig<Body, Key>,
  ): FinalConfig<Body, Key> {
    const defaults: Pick<FinalConfig<Body, Key>, "name"> = {
      name: "default",
    }
    const overrideKafkaConfig: Pick<
      FinalConfig<Body, Key>["kafkaConfig"],
      "api.version.request" | "dr_cb"
    > = {
      "api.version.request": true,
      dr_cb: true,
    }
    return merge({}, defaults, config, { kafkaConfig: overrideKafkaConfig })
  }
}

export interface KafkaProducerConfig<Body = any, Key = any> {
  name?: string
  kafkaConfig: rdkafka.ProducerGlobalConfig
  topicConfig: rdkafka.ProducerTopicConfig
  bodySerializer: BodySerializer<Body>
  keyGenerator: KeyGenerator<Body, Key>
  keySerializer: KeySerializer<Key>
  partitioner: Partitioner<Body, Key>
}

interface FinalConfig<Body, Key> extends KafkaProducerConfig<Body, Key> {
  name: string
}

interface EmitterEvents {
  ready: (info: any, metadata: any) => void
  disconnected: void
  error: (err: unknown, context: string) => void
  deliveryReport: (
    error: rdkafka.LibrdKafkaError,
    report: rdkafka.DeliveryReport,
  ) => void
}
type TypedEmitter = StrictEventEmitter<EventEmitter, EmitterEvents>
