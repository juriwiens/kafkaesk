import { v4 as uuidV4 } from "uuid"

type KeyGeneratorWithTopic<Body, Key> = (body: Body, topic: string) => Key
type KeyGeneratorWoutTopic<Body, Key> = (body: Body) => Key
export type KeyGenerator<Body, Key> =
  | KeyGeneratorWithTopic<Body, Key>
  | KeyGeneratorWoutTopic<Body, Key>

export function generateUuidV4<Body, Key>(_body: Body, _key: Key): string {
  return uuidV4()
}
