import { KafkaBatchConsumer } from "./batch_consumer"
import type { Logger } from "./logger.interface"

export class KafkaBatchConsumerLogging {
  static observe(logger: Logger, consumer: KafkaBatchConsumer): void {
    consumer
      .on("ready", (info, metadata) => {
        logger.info("Kafka consumer is ready")
      })
      .on("disconnected", () => logger.warn("Kafka consumer is disconnected"))
      .on("error", (err, context) =>
        logger.error(
          { err, context },
          `Kafka producer error on ${context}: ${
            err instanceof Error ? err.message : err
          }`,
        ),
      )
      .on("invalidMessage", msg =>
        logger.error({ msg }, "Kafka consumer received an invalid message"),
      )
      .on("consuming", consuming =>
        logger.info(`Kafka consumer consuming state: ${consuming}`),
      )
      .on("rawBatch", batch => logger.debug(`rawBatch size ${batch.length}`))
      .on("offsetCommit", offsetCommits => {
        logger.debug({ offsetCommits }, "Kafka consumer commited offsets")
      })
  }
}
