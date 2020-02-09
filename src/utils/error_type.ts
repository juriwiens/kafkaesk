export function getErrorType(err: any): string {
  return err !== null &&
    typeof err === 'object' &&
    err!.constructor &&
    typeof err!.constructor.name === 'string'
    ? err!.constructor.name
    : typeof err
}
