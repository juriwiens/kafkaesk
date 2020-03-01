import { Logger } from "./logger.interface"
import { KafkaProducer } from "./producer"

export class KafkaProducerLogging {
  static observe(logger: Logger, producer: KafkaProducer): void {
    producer
      .on("ready", () => {
        logger.info("Kafka producer is ready")
      })
      .on("error", (err, context) => {
        logger.error(
          { err, context },
          `Kafka producer error on ${context}: ${
            err instanceof Error ? err.message : err
          }`,
        )
      })
      .on("disconnected", () => {
        logger.warn("Kafka producer is disconnected")
      })
      .on("deliveryReport", (err, report) => {
        if (err) {
          logger.error(
            { err, report },
            `Kafka delivery report with error: ${
              err instanceof Error ? err.message : err
            }`,
          )
        } else {
          logger.debug({ report }, "Kafka delivery report")
        }
      })
  }
}
