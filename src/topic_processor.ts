import { BodyDeserializer, KeyDeserializer } from "./deserializer"
import { Batch } from "./batch_consumer"
import { KafkaMessage } from "./message"

export type ProcessFunc<Body, Key> = (batch: Batch<Body, Key>) => Promise<void>

export type BodyValidatorFunc = (body: unknown) => boolean

export interface KafkaTopicProcessor<Body, Key> {
  topic: string
  level: "topic" | "partition"
  bodyDeserializer: BodyDeserializer<Body>
  bodyValidation?: {
    func: BodyValidatorFunc
    onInvalidMessage: (msg: KafkaMessage<unknown, Key>) => void
  }
  keyDeserializer: KeyDeserializer<Key>
  processor: ProcessFunc<Body, Key>
}
