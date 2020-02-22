import { promisify } from "util"
import { EventEmitter } from "events"
import * as rdkafka from "node-rdkafka"
import merge from "lodash.merge"
import { identity } from "./utils/identity"

import StrictEventEmitter from "strict-event-emitter-types"
import * as rdkafkaT from "./node-rdkafka"
import { BodySerializer, KeySerializer } from "./serializer"
import { KeyGenerator } from "./key_generator"
import { Partitioner } from "./partitioner"
import { Promisified } from "./utils/generic_types"

export class KafkaProducer<
  Body = any,
  Key = any
> extends (EventEmitter as new () => TypedEmitter) {
  readonly name: string
  readonly kafkaConfig: rdkafkaT.ProducerKafkaConfig
  readonly topicConfig: rdkafkaT.ProducerTopicConfig
  readonly bodySerializer: BodySerializer<Body>
  readonly keyGenerator: KeyGenerator<Body, Key>
  readonly keySerializer: KeySerializer<Key>
  readonly partitioner: Partitioner<Body, Key>
  readonly producer: rdkafkaT.HighLevelProducer
  private _producePromisified: Promisified<
    rdkafkaT.HighLevelProducer["produce"]
  >

  constructor(config: KafkaProducerConfig<Body, Key>) {
    super()
    const finalConfig = KafkaProducer.finalizeConfig(config)
    this.name = finalConfig.name
    this.kafkaConfig = finalConfig.kafkaConfig
    this.topicConfig = finalConfig.topicConfig
    this.bodySerializer = finalConfig.bodySerializer
    this.keyGenerator = finalConfig.keyGenerator
    this.keySerializer = finalConfig.keySerializer
    this.partitioner = finalConfig.partitioner

    this.producer = new rdkafka.HighLevelProducer(
      this.kafkaConfig,
      this.topicConfig,
    ) as rdkafkaT.HighLevelProducer
    this._producePromisified = promisify(this.producer.produce).bind(
      this.producer,
    )
    this.producer.on("ready", (info, metadata) =>
      this.emit("ready", info, metadata),
    )
    this.producer.on("error", err => this.emit("error", err, "producer_err"))
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

  produce(topic: string, body: Body, key: Key | null): Promise<number> {
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
    const defaults: Required<Pick<KafkaProducerConfig<Body, Key>, "name">> = {
      name: "default",
    }
    const overrideKafkaConfig: Pick<
      KafkaProducerConfig<Body, Key>["kafkaConfig"],
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
  kafkaConfig: rdkafkaT.ProducerKafkaConfig
  topicConfig: rdkafkaT.ProducerTopicConfig
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
  deliveryReport: rdkafkaT.DeliveryReportCallback
}
type TypedEmitter = StrictEventEmitter<EventEmitter, EmitterEvents>
