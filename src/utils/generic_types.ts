export type DeepPartial<T> = {
  [P in keyof T]?: T[P] | DeepPartial<T[P]>
}

export type CallbackWithResult<Result, Err = any> = (
  err: Err,
  result: Result
) => void
export type CallbackWoutResult<Err = any> = (err?: Err) => void

export type UnpackPromise<T> = T extends Promise<infer U> ? U : T

export type Promisified<Func> = Func extends (
  this: infer This,
  cb: CallbackWithResult<infer Result, infer Err>
) => void
  ? (this: This) => Promise<Result>
  : Func extends (this: infer This, cb: CallbackWoutResult<infer Err>) => void
  ? (this: This) => Promise<void>
  : Func extends (
      this: infer This,
      arg1: infer Arg1,
      cb: CallbackWithResult<infer Result, infer Err>
    ) => void
  ? (this: This, arg1: Arg1) => Promise<Result>
  : Func extends (
      this: infer This,
      arg1: infer Arg1,
      cb: CallbackWoutResult<infer Err>
    ) => void
  ? (this: This, arg1: Arg1) => Promise<void>
  : Func extends (
      this: infer This,
      arg1: infer Arg1,
      arg2: infer Arg2,
      cb: CallbackWithResult<infer Result, infer Err>
    ) => void
  ? (this: This, arg1: Arg1, arg2: Arg2) => Promise<Result>
  : Func extends (
      this: infer This,
      arg1: infer Arg1,
      arg2: infer Arg2,
      cb: CallbackWoutResult<infer Err>
    ) => void
  ? (this: This, arg1: Arg1, arg2: Arg2) => Promise<void>
  : Func extends (
      this: infer This,
      arg1: infer Arg1,
      arg2: infer Arg2,
      arg3: infer Arg3,
      cb: CallbackWithResult<infer Result, infer Err>
    ) => void
  ? (this: This, arg1: Arg1, arg2: Arg2, arg3: Arg3) => Promise<Result>
  : Func extends (
      this: infer This,
      arg1: infer Arg1,
      arg2: infer Arg2,
      arg3: infer Arg3,
      cb: CallbackWoutResult<infer Err>
    ) => void
  ? (this: This, arg1: Arg1, arg2: Arg2, arg3: Arg3) => Promise<void>
  : Func extends (
      this: infer This,
      arg1: infer Arg1,
      arg2: infer Arg2,
      arg3: infer Arg3,
      arg4: infer Arg4,
      cb: CallbackWithResult<infer Result, infer Err>
    ) => void
  ? (
      this: This,
      arg1: Arg1,
      arg2: Arg2,
      arg3: Arg3,
      arg4: Arg4
    ) => Promise<Result>
  : Func extends (
      this: infer This,
      arg1: infer Arg1,
      arg2: infer Arg2,
      arg3: infer Arg3,
      arg4: infer Arg4,
      cb: CallbackWoutResult<infer Err>
    ) => void
  ? (
      this: This,
      arg1: Arg1,
      arg2: Arg2,
      arg3: Arg3,
      arg4: Arg4
    ) => Promise<void>
  : Func extends (
      this: infer This,
      arg1: infer Arg1,
      arg2: infer Arg2,
      arg3: infer Arg3,
      arg4: infer Arg4,
      arg5: infer Arg5,
      cb: CallbackWithResult<infer Result, infer Err>
    ) => void
  ? (
      this: This,
      arg1: Arg1,
      arg2: Arg2,
      arg3: Arg3,
      arg4: Arg4,
      arg5: Arg5
    ) => Promise<Result>
  : Func extends (
      this: infer This,
      arg1: infer Arg1,
      arg2: infer Arg2,
      arg3: infer Arg3,
      arg4: infer Arg4,
      arg5: infer Arg5,
      cb: CallbackWoutResult<infer Err>
    ) => void
  ? (
      this: This,
      arg1: Arg1,
      arg2: Arg2,
      arg3: Arg3,
      arg4: Arg4,
      arg5: Arg5
    ) => Promise<void>
  : never
