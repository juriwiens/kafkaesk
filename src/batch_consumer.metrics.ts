import range from "lodash.range"
import promClient from "prom-client"
import { KafkaBatchConsumer } from "./batch_consumer"
import { getErrorType } from "./utils/error_type"

export class KafkaBatchConsumerMetrics {
  constructor(
    registers: promClient.Registry[] = [promClient.register],

    readonly errorCounter = new promClient.Counter({
      registers,
      name: "kafka_consumer_errors_total",
      help: "Number of all errors, labeled by error_type and context.",
      labelNames: ["name", "context", "error_type"],
    }),

    readonly isConnectedGauge = new promClient.Gauge({
      registers,
      name: "kafka_consumer_connected",
      help: "Indicates if the producer is connected.",
      labelNames: ["name"],
    }),

    readonly isConsumingGauge = new promClient.Gauge({
      registers,
      name: "kafka_consumer_consuming",
      help: "Indicates if the producer is consuming.",
      labelNames: ["name"],
    }),

    readonly isPollingGauge = new promClient.Gauge({
      registers,
      name: "kafka_consumer_polling",
      help: "Indicates if the producer is polling.",
      labelNames: ["name"],
    }),

    readonly consumedMessageCounter = new promClient.Counter({
      registers,
      name: "kafka_consumer_consumed_messages_total",
      help: "Number of consumed messages, labeled by topic and partition.",
      labelNames: ["name", "topic", "partition"],
    }),

    readonly invalidMessageCounter = new promClient.Counter({
      registers,
      name: "kafka_consumer_invalid_messages_total",
      help: "Number of invalid messages, labeled by topic and partition.",
      labelNames: ["name", "topic", "partition"],
    }),

    readonly rawBatchCounter = new promClient.Counter({
      registers,
      name: "kafka_consumer_raw_batches_total",
      help: "Number of consumed raw batches.",
      labelNames: ["name"],
    }),

    readonly batchCounter = new promClient.Counter({
      registers,
      name: "kafka_consumer_batches_total",
      help:
        "Number of consumed splitted batches, labeled by topic and (eventually) partition.",
      labelNames: ["name", "topic", "partition"],
    }),

    readonly rawBatchSizeHistogram = new promClient.Histogram({
      registers,
      name: "kafka_consumer_raw_batch_size",
      help: "Number of messages per raw batch.",
      buckets: [...range(0, 100, 10), ...range(100, 1000, 50), 1000],
      labelNames: ["name"],
    }),

    readonly batchSizeHistogram = new promClient.Histogram({
      registers,
      name: "kafka_consumer_batch_size",
      help: "Number of messages per batch.",
      buckets: [...range(0, 100, 10), ...range(100, 1000, 50), 1000],
      labelNames: ["name", "topic", "partition"],
    }),

    readonly consumedOffsetGauge = new promClient.Gauge({
      registers,
      name: "kafka_consumer_consumed_offset",
      help: "Consumed message offset, labeled by topic and partition.",
      labelNames: ["name", "topic", "partition"],
    }),

    readonly commitedOffsetGauge = new promClient.Gauge({
      registers,
      name: "kafka_consumer_commited_offset",
      help: "Commited message offset, labeled by topic and partition.",
      labelNames: ["name", "topic", "partition"],
    }),
  ) {}

  observe(consumer: KafkaBatchConsumer) {
    this.observeErrorCount(consumer)
    this.observeIsConnected(consumer)
    this.observeIsConsuming(consumer)
    this.observeIsPolling(consumer)
    this.observeConsumedMessageCount(consumer)
    this.observeInvalidMessageCount(consumer)
    this.observeRawBatchCount(consumer)
    this.observeBatchCount(consumer)
    this.observeRawBatchSize(consumer)
    this.observeBatchSize(consumer)
    this.observeConsumedOffset(consumer)
    this.observeCommittedOffset(consumer)
  }

  private observeErrorCount(consumer: KafkaBatchConsumer): void {
    const { name } = consumer
    consumer.on("error", (err, context) =>
      this.errorCounter.inc({
        name,
        error_type: getErrorType(err),
        context: typeof context === "string" ? context : "unknown",
      }),
    )
  }

  private observeIsConnected(consumer: KafkaBatchConsumer): void {
    const nameLabel = { name: consumer.name }
    this.isConnectedGauge.set(nameLabel, 0)
    consumer.on("ready", () => this.isConnectedGauge.set(nameLabel, 1))
    consumer.on("disconnected", () => this.isConnectedGauge.set(nameLabel, 0))
  }

  private observeIsConsuming(consumer: KafkaBatchConsumer): void {
    const nameLabel = { name: consumer.name }
    consumer.on("consuming", consuming =>
      this.isConsumingGauge.set(nameLabel, consuming ? 1 : 0),
    )
  }

  private observeIsPolling(consumer: KafkaBatchConsumer): void {
    const nameLabel = { name: consumer.name }
    consumer.on("polling", polling =>
      this.isPollingGauge.set(nameLabel, polling ? 1 : 0),
    )
  }

  private observeConsumedMessageCount(consumer: KafkaBatchConsumer): void {
    const { name } = consumer
    consumer.on("batchesProcessed", batchesProcessed => {
      for (const batch of batchesProcessed) {
        for (const { topic, partition, messageCount } of Object.values(
          batch.partitionStats,
        )) {
          this.consumedMessageCounter.inc(
            { name, topic, partition },
            messageCount,
          )
        }
      }
    })
  }

  private observeInvalidMessageCount(consumer: KafkaBatchConsumer): void {
    const { name } = consumer
    consumer.on("invalidMessage", ({ topic, partition }) =>
      this.invalidMessageCounter.inc({ name, topic, partition }),
    )
  }

  private observeRawBatchCount(consumer: KafkaBatchConsumer): void {
    const nameLabel = { name: consumer.name }
    consumer.on("rawBatch", () => {
      this.rawBatchCounter.inc(nameLabel)
    })
  }

  private observeBatchCount(consumer: KafkaBatchConsumer): void {
    const { name } = consumer
    consumer.on("batchesProcessed", batchesProcessed => {
      for (const { topic, partition } of batchesProcessed) {
        this.batchCounter.inc({
          name,
          topic,
          partition: typeof partition === "number" ? partition : "any",
        })
      }
    })
  }

  private observeRawBatchSize(consumer: KafkaBatchConsumer): void {
    const nameLabel = { name: consumer.name }
    consumer.on("rawBatch", rawBatch =>
      this.rawBatchSizeHistogram.observe(nameLabel, rawBatch.length),
    )
  }

  private observeBatchSize(consumer: KafkaBatchConsumer): void {
    const { name } = consumer
    consumer.on("batchesProcessed", batchesProcessed => {
      for (const { topic, partition, messages } of batchesProcessed) {
        this.batchSizeHistogram.observe(
          {
            name,
            topic,
            partition: typeof partition === "number" ? partition : "any",
          },
          messages.length,
        )
      }
    })
  }

  private observeConsumedOffset(consumer: KafkaBatchConsumer): void {
    const { name } = consumer
    consumer.on("batchesProcessed", batchesProcessed => {
      for (const batch of batchesProcessed) {
        for (const { topic, partition, offset } of Object.values(
          batch.partitionStats,
        )) {
          this.consumedOffsetGauge.set({ name, topic, partition }, offset)
        }
      }
    })
  }

  private observeCommittedOffset(consumer: KafkaBatchConsumer): void {
    const { name } = consumer
    consumer.on("offsetCommit", offsetCommits => {
      for (const { topic, partition, offset } of offsetCommits) {
        this.commitedOffsetGauge.set({ name, topic, partition }, offset)
      }
    })
  }
}
