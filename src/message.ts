export interface KafkaMessage<Body, Key> {
  body: Body
  key: Key
  topic: string
  partition: number
  offset: number
  size: number
}
