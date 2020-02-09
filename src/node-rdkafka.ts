/// <reference types="node" />
import { Producer } from 'node-rdkafka'

export interface CommonKafkaConfig {
  'builtin.features'?: string
  'client.id'?: string
  'metadata.broker.list': string
  'message.max.bytes'?: number
  'message.copy.max.bytes'?: number
  'receive.message.max.bytes'?: number
  'max.in.flight.requests.per.connection'?: number
  'metadata.request.timeout.ms'?: number
  'topic.metadata.refresh.interval.ms'?: number
  'metadata.max.age.ms'?: number
  'topic.metadata.refresh.fast.interval.ms'?: number
  'topic.metadata.refresh.fast.cnt'?: number
  'topic.metadata.refresh.sparse'?: boolean
  'topic.blacklist'?: string
  debug?: string
  'socket.timeout.ms'?: number
  'socket.blocking.max.ms'?: number
  'socket.send.buffer.bytes'?: number
  'socket.receive.buffer.bytes'?: number
  'socket.keepalive.enable'?: boolean
  'socket.nagle.disable'?: boolean
  'socket.max.fails'?: number
  'broker.address.ttl'?: number
  'broker.address.family'?: 'any' | 'v4' | 'v6'
  'reconnect.backoff.jitter.ms'?: number
  'statistics.interval.ms'?: number
  enabled_events?: number
  log_level?: number
  'log.queue'?: boolean
  'log.thread.name'?: boolean
  'log.connection.close'?: boolean
  'internal.termination.signal'?: number
  'api.version.request'?: boolean
  'api.version.fallback.ms'?: number
  'broker.version.fallback'?: string
  'security.protocol'?: 'plaintext' | 'ssl' | 'sasl_plaintext' | 'sasl_ssl'
  'ssl.cipher.suites'?: string
  'ssl.key.location'?: string
  'ssl.key.password'?: string
  'ssl.certificate.location'?: string
  'ssl.ca.location'?: string
  'ssl.crl.location'?: string
  'sasl.mechanisms'?: string
  'sasl.kerberos.service.name'?: string
  'sasl.kerberos.principal'?: string
  'sasl.kerberos.kinit.cmd'?: string
  'sasl.kerberos.keytab'?: string
  'sasl.kerberos.min.time.before.relogin'?: number
  'sasl.username'?: string
  'sasl.password'?: string
  'partition.assignment.strategy'?: string
  'session.timeout.ms'?: number
  'heartbeat.interval.ms'?: number
  'group.protocol.type'?: string
  'coordinator.query.interval.ms'?: number
  'group.id'?: string
  event_cb?: boolean
}

export interface ConsumerKafkaConfig extends CommonKafkaConfig {
  'group.id': string
  'enable.auto.commit'?: boolean
  'auto.commit.interval.ms'?: number
  'enable.auto.offset.store'?: boolean
  'queued.min.messages'?: number
  'queued.max.messages.kbytes'?: number
  'fetch.wait.max.ms'?: number
  'fetch.message.max.bytes'?: number
  'fetch.min.bytes'?: number
  'fetch.error.backoff.ms'?: number
  'offset.store.method'?: 'none' | 'file' | 'broker'
  'enable.partition.eof'?: boolean
  'check.crcs'?: boolean
}

export interface ProducerKafkaConfig extends CommonKafkaConfig {
  'queue.buffering.max.messages'?: number
  'queue.buffering.max.kbytes'?: number
  'queue.buffering.max.ms'?: number
  'message.send.max.retries'?: number
  'retry.backoff.ms'?: number
  'compression.codec'?: 'none' | 'gzip' | 'snappy' | 'lz4'
  'batch.num.messages'?: number
  'delivery.report.only.error'?: boolean
}

export type KafkaConfig = ConsumerKafkaConfig & ProducerKafkaConfig

export interface ConsumerTopicConfig {
  'auto.commit.enable'?: boolean
  'auto.commit.interval.ms'?: number
  'auto.offset.reset'?:
    | 'smallest'
    | 'earliest'
    | 'beginning'
    | 'largest'
    | 'latest'
    | 'end'
    | 'error'
  'offset.store.path'?: string
  'offset.store.sync.interval.ms'?: number
  'offset.store.method'?: 'file' | 'broker'
  'consume.callback.max.messages'?: number
}

export interface ProducerTopicConfig {
  'request.required.acks'?: number
  'request.timeout.ms'?: number
  'message.timeout.ms'?: number
  'produce.offset.report'?: boolean
}

export interface RawMessage {
  key: Buffer
  value: Buffer
  topic: string
  partition: number
  offset: number
  size: number
}

export interface HighLevelProducer extends Producer {
  produce(
    topic: string,
    partition: number | null,
    message: Buffer | null,
    key: string,
    timestamp: number | null,
    callback: (err: any, offset: number) => void,
  ): boolean

  setKeySerializer(keySerializer: <Key>(key: Key) => string): void
  setValueSerializer(valueSerializer: <Value>(value: Value) => Buffer): void
}

export interface OffsetCommit {
  topic: string
  partition: number
  offset?: number
}

export interface DeliveryReport {
  topic: string
  partition: number
  offset: number
  key: Buffer
  size: number
}
