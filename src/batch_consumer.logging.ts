import { KafkaBatchConsumer } from "./batch_consumer"
import { Logger } from "./logger.interface"
import { KafkaError } from "./kafka_error"

export class KafkaBatchConsumerLogging {
  static observe(logger: Logger, consumer: KafkaBatchConsumer): void {
    consumer
      .on("ready", (info, metadata) => {
        logger.info({ info }, "Kafka consumer is ready")
      })
      .on("disconnected", () => {
        logger.warn("Kafka consumer is disconnected")
      })
      .on("error", err => {
        logger.error(
          { err, context: err.context },
          `Kafka producer error on ${err.context}: ${err.message}`,
        )
      })
      .on("invalidMessage", msg => {
        logger.error(
          { message: JSON.stringify(msg) },
          "Kafka consumer received an invalid message",
        )
      })
      .on("consuming", consuming => {
        logger.info(`Kafka consumer consuming state: ${consuming}`)
      })
      .on("rawBatch", batch => {
        logger.debug(`rawBatch size ${batch.length}`)
      })
      .on("offsetCommit", offsetCommits => {
        logger.debug({ offsetCommits }, "Kafka consumer commited offsets")
      })
  }
}
