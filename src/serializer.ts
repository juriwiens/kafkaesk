type KeySerializerWithTopic<Key> = (key: Key, topic: string) => string
type KeySerializerWoutTopic<Key> = (key: Key) => string
export type KeySerializer<Key> =
  | KeySerializerWithTopic<Key>
  | KeySerializerWoutTopic<Key>

type BodySerializerWithTopic<Body> = (body: Body, topic: string) => Buffer
type BodySerializerWoutTopic<Body> = (body: Body) => Buffer
export type BodySerializer<Body> =
  | BodySerializerWithTopic<Body>
  | BodySerializerWoutTopic<Body>

export function serializeJson<Body>(body: Body): Buffer {
  return Buffer.from(JSON.stringify(body))
}
