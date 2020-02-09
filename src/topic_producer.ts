import { BodySerializer, KeySerializer } from './serializer'
import { KeyGenerator } from './key_generator'
import { Partitioner } from './partitioner'

export interface KafkaTopicProducerConfig<Body, Key> {
  topic: string
  bodySerializer: BodySerializer<Body>
  keyGenerator: KeyGenerator<Body, Key>
  keySerializer: KeySerializer<Key>
  partitioner: Partitioner<Body, Key>
}
