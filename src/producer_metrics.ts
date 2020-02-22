import promClient from "prom-client"
import { KafkaProducer } from "./producer"
import { getErrorType } from "./utils/error_type"

export class KafkaProducerMetrics {
  errorCounter: promClient.Counter<"context" | "error_type">
  connectedGauge: promClient.Gauge<"name">
  producedMessagesCounter: promClient.Counter<"topic" | "partition">
  offsetGauge: promClient.Gauge<"topic" | "partition">

  constructor(registers: promClient.Registry[] = [promClient.register]) {
    this.errorCounter = new promClient.Counter({
      registers,
      name: "kafka_producer_errors_total",
      help: "Number of all errors, labeled by error_type and context.",
      labelNames: ["context", "error_type"],
    })
    this.connectedGauge = new promClient.Gauge({
      registers,
      name: "kafka_producer_connected",
      help: "Indicates if the producer is connected.",
      labelNames: ["name"],
    })
    this.producedMessagesCounter = new promClient.Counter({
      registers,
      name: "kafka_producer_produced_messages_total",
      help:
        "Number of produced messages, labeled by topic, partition and result.",
      labelNames: ["topic", "partition"],
    })
    this.offsetGauge = new promClient.Gauge({
      registers,
      name: "kafka_producer_offset",
      help: "Produced offset, labeled by topic and partition.",
      labelNames: ["topic", "partition"],
    })
  }

  observe(producer: KafkaProducer<any, any>) {
    const { name } = producer
    this.connectedGauge.set({ name }, 0)
    producer.on("ready", () => this.connectedGauge.set({ name }, 1))
    producer.on("disconnected", () => this.connectedGauge.set({ name }, 0))
    producer.on("error", (err, context) =>
      this.errorCounter.inc({
        error_type: getErrorType(err),
        context,
      }),
    )
    producer.on("deliveryReport", (err, { topic, partition, offset }) => {
      if (err) {
        this.errorCounter.inc({
          context: "delivery_report",
          error_type: getErrorType(err),
        })
      }
      this.producedMessagesCounter.inc({ topic, partition })
      this.offsetGauge.set({ topic, partition }, offset)
    })
  }
}
