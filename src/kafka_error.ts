import { CODES } from "node-rdkafka"

export class KafkaError extends Error {
  constructor(
    readonly message: string,
    readonly name: string,
    readonly context: string,
    readonly code: number | null = null,
    readonly originalError: unknown = null,
  ) {
    super(message)
  }

  static fromCode(code: number, context: string): KafkaError {
    const name = KafkaError.codeToNameMap[code] || "UNKNOWN_ERR_CODE"
    return new KafkaError(
      `Kafka error ${code}: ${name}`,
      name,
      context,
      code,
      code,
    )
  }

  static fromError(err: Error, context: string): KafkaError {
    return new KafkaError(err.message, err.name, context, null, err)
  }

  static fromUnknownError(err: unknown, context: string): KafkaError {
    if (typeof err === "number") {
      return KafkaError.fromCode(err, context)
    } else if (err instanceof Error) {
      return err instanceof KafkaError
        ? err
        : KafkaError.fromError(err, context)
    } else {
      return new KafkaError(
        `Unknown error: ${err}`,
        "UNKNOWN_ERR_NAME",
        context,
        null,
        err,
      )
    }
  }

  static codeToNameMap = Object.fromEntries(
    Object.entries(CODES.ERRORS).map(([err, code]) => [code, err]),
  )
}
