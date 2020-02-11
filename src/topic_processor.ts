import { BodyDeserializer, KeyDeserializer } from "./deserializer"
import { Batch } from "./batch_consumer"

export type ProcessDoneCallback = (err?: Error | null) => void

export type ProcessFunc<Body, Key> = (
  batch: Batch<Body, Key>,
  done: ProcessDoneCallback,
) => void

export type BodyValidatorFunc = (body: unknown) => boolean

export interface KafkaTopicProcessor<Body, Key> {
  topic: string
  level: "topic" | "partition"
  bodyDeserializer: BodyDeserializer<Body>
  bodyValidator: BodyValidatorFunc
  keyDeserializer: KeyDeserializer<Key>
  processor: ProcessFunc<Body, Key>
}
