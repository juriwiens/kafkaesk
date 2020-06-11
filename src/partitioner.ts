type PartitionerWithTopic<Body, Key> = (
  body: Body,
  key: Key,
  topic: string
) => number
type PartitionerWoutTopic<Body, Key> = (body: Body, key: Key) => number
export type Partitioner<Body, Key> =
  | PartitionerWithTopic<Body, Key>
  | PartitionerWoutTopic<Body, Key>

export function rdkafkaDefaultPartitioner<Body, Key>(_body: Body, _key: Key) {
  return -1
}
