import { EventEmitter } from 'events'
import * as rdkafka from 'node-rdkafka'
import merge from 'lodash.merge'
import { identity } from './utils/identity'

import StrictEventEmitter from 'strict-event-emitter-types'
import * as rdkafkaT from './node-rdkafka'
import { BodySerializer, KeySerializer } from './serializer'
import { KeyGenerator } from './key_generator'
import { Partitioner } from './partitioner'
import { DeepPartial } from './utils/generic_types'

export interface KafkaProducerConfig<Body = any, Key = any> {
  kafkaConfig: rdkafkaT.ProducerKafkaConfig
  topicConfig: rdkafkaT.ProducerTopicConfig
  bodySerializer: BodySerializer<Body>
  keyGenerator: KeyGenerator<Body, Key>
  keySerializer: KeySerializer<Key>
  partitioner: Partitioner<Body, Key>
}

export type ProduceCallback = (err: any, offset: number) => void

interface FinalConfig<Body, Key> extends KafkaProducerConfig<Body, Key> {}

interface EmitterEvents {
  ready: (info: any, metadata: any) => void
  disconnected: void
  error: (err: unknown, context: string) => void
  deliveryReport: rdkafkaT.DeliveryReportCallback
}
type TypedEmitter = StrictEventEmitter<EventEmitter, EmitterEvents>

export class KafkaProducer<
  Body = any,
  Key = any
> extends (EventEmitter as new () => TypedEmitter) {
  readonly kafkaConfig: rdkafkaT.ProducerKafkaConfig
  readonly topicConfig: rdkafkaT.ProducerTopicConfig
  readonly bodySerializer: BodySerializer<Body>
  readonly keyGenerator: KeyGenerator<Body, Key>
  readonly keySerializer: KeySerializer<Key>
  readonly partitioner: Partitioner<Body, Key>
  readonly producer: rdkafkaT.HighLevelProducer

  constructor(config: KafkaProducerConfig<Body, Key>) {
    super()
    const finalConfig = KafkaProducer.finalizeConfig(config)
    this.kafkaConfig = finalConfig.kafkaConfig
    this.topicConfig = finalConfig.topicConfig
    this.bodySerializer = finalConfig.bodySerializer
    this.keyGenerator = finalConfig.keyGenerator
    this.keySerializer = finalConfig.keySerializer
    this.partitioner = finalConfig.partitioner

    // @ts-ignore missing HighLevelProducer type
    this.producer = new rdkafka.HighLevelProducer(
      this.kafkaConfig,
      this.topicConfig,
    )
    this.producer.on('ready', (info, metadata) =>
      this.emit('ready', info, metadata),
    )
    this.producer.on('error', err => this.emit('error', err, 'producer_err'))
    this.producer.on('delivery-report', (err, report) =>
      this.emit('deliveryReport', err, report),
    )
    this.producer.setValueSerializer(identity as any)
    this.producer.setKeySerializer(identity as any)
  }

  connect(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.producer.connect(null, (err, metadata) =>
        err ? reject(err) : resolve(metadata),
      )
    })
  }

  disconnect(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.producer.disconnect((err, metrics) =>
        err ? reject(err) : resolve(metrics),
      )
    })
  }

  isConnected(): boolean {
    return this.producer.isConnected()
  }

  produce(
    topic: string,
    body: Body,
    key: Key | null,
    callback: ProduceCallback,
  ): void {
    const _key = key != null ? key : this.keyGenerator(body, topic)
    this.producer.produce(
      topic,
      this.partitioner(body, _key, topic),
      this.bodySerializer(body, topic),
      this.keySerializer(_key, topic),
      Date.now(),
      callback,
    )
  }

  produceAsync<B extends Body, K extends Key>(
    topic: string,
    body: B,
    key: K | null,
  ): Promise<number> {
    return new Promise((resolve, reject) =>
      this.produce(topic, body, key, (err, offset) =>
        err ? reject(err) : resolve(offset),
      ),
    )
  }

  private static finalizeConfig<Body, Key>(
    config: KafkaProducerConfig<Body, Key>,
  ): FinalConfig<Body, Key> {
    const defaults: DeepPartial<KafkaProducerConfig<Body, Key>> = {}
    const overrideKafkaConfig: Pick<
      KafkaProducerConfig<Body, Key>['kafkaConfig'],
      'api.version.request' | 'dr_cb'
    > = {
      'api.version.request': true,
      dr_cb: true,
    }
    return merge({}, defaults, config, { kafkaConfig: overrideKafkaConfig })
  }
}
