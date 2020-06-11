/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { identity } from "./identity"

// eslint-disable-next-line @typescript-eslint/ban-types
export function inferActualType<Basis extends object>(): <Obj extends Basis>(
  obj: Obj,
) => Obj {
  return identity
}
