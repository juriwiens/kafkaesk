import promClient from "prom-client"
import { KafkaProducer } from "./producer"
import { getErrorType } from "./utils/error_type"

export class KafkaProducerMetrics {
  constructor(
    registers: promClient.Registry[] = [promClient.register],
    readonly errorCounter = new promClient.Counter({
      registers,
      name: "kafka_producer_errors_total",
      help: "Number of all errors, labeled by error_type and context.",
      labelNames: ["name", "context", "error_type"],
    }),
    readonly connectedGauge = new promClient.Gauge({
      registers,
      name: "kafka_producer_connected",
      help: "Indicates if the producer is connected.",
      labelNames: ["name"],
    }),
    readonly producedMessagesCounter = new promClient.Counter({
      registers,
      name: "kafka_producer_produced_messages_total",
      help:
        "Number of produced messages, labeled by topic, partition and result.",
      labelNames: ["name", "topic", "partition"],
    }),
    readonly offsetGauge = new promClient.Gauge({
      registers,
      name: "kafka_producer_offset",
      help: "Produced offset, labeled by topic and partition.",
      labelNames: ["name", "topic", "partition"],
    }),
  ) {}

  observe(producer: KafkaProducer<any, any>): this {
    const { name } = producer
    const nameLabel = { name }
    this.connectedGauge.set(nameLabel, 0)
    producer.on("ready", () => this.connectedGauge.set(nameLabel, 1))
    producer.on("disconnected", () => this.connectedGauge.set(nameLabel, 0))
    producer.on("error", (err, context) =>
      this.errorCounter.inc({
        name,
        error_type: getErrorType(err),
        context,
      }),
    )
    producer.on("deliveryReport", (err, { topic, partition, offset }) => {
      if (err) {
        this.errorCounter.inc({
          name,
          context: "delivery_report",
          error_type: getErrorType(err),
        })
      }
      this.producedMessagesCounter.inc({ name, topic, partition })
      this.offsetGauge.set({ name, topic, partition }, offset)
    })
    return this
  }
}
