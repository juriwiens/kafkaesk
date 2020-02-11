export type DeepPartial<T> = {
  [P in keyof T]?: T[P] | DeepPartial<T[P]>
}
