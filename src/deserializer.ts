type KeyDeserializerWithTopic<Key> = (keyBuffer: Buffer, topic: string) => Key
type KeyDeserializerWoutTopic<Key> = (keyBuffer: Buffer) => Key
export type KeyDeserializer<Key> =
  | KeyDeserializerWithTopic<Key>
  | KeyDeserializerWoutTopic<Key>

export type BodyDeserializer<Body> = (
  bodyBuffer: Buffer,
  topic?: string,
) => Body

export function deserializeJson<Out>(buffer: Buffer): Out {
  return JSON.parse(buffer.toString())
}

export function deserializeString(buffer: Buffer): string {
  return buffer.toString()
}
