import fastifyPlugin from "fastify-plugin"
import { librdkafkaVersion } from "node-rdkafka"
import { KafkaBatchConsumer, KafkaBatchConsumerConfig } from "./batch_consumer"
import { KafkaProducer, KafkaProducerConfig } from "./producer"
import { KafkaProducerLogging } from "./producer.logging"
import { KafkaProducerMetrics } from "./producer.metrics"
import { KafkaBatchConsumerMetrics } from "./batch_consumer.metrics"
import { KafkaBatchConsumerLogging } from "./batch_consumer.logging"
import type { PrometheusMeter } from "./prometheus_meter"

export const kafkaFastifyPlugin: Plugin = fastifyPlugin(
  async (app, opts: KafkaPluginOptions) => {
    const prometheusMeter = opts.prometheusMeter || app.prometheusMeter
    const connect = typeof opts.connect === "boolean" ? opts.connect : true

    app.log.info(
      "Initializing kafka-plugin using librdkafka %s",
      librdkafkaVersion
    )
    if (opts.producer) {
      app.log.debug("Found kafka producer config")
      const producer = new KafkaProducer(opts.producer)
      KafkaProducerLogging.observe(app.log, producer)
      if (prometheusMeter) {
        new KafkaProducerMetrics(prometheusMeter).observe(producer)
      }
      if (connect) {
        await producer.connect()
      }
      app.decorate("kafkaProducer", producer)
      app.addHook("onClose", async () => producer.disconnect())
    }
    if (opts.consumer) {
      app.log.debug("Found kafka consumer config")
      const consumer = new KafkaBatchConsumer(opts.consumer)
      KafkaBatchConsumerLogging.observe(app.log, consumer)
      if (prometheusMeter) {
        new KafkaBatchConsumerMetrics(prometheusMeter).observe(consumer)
      }
      if (connect) {
        await consumer.connect()
      }
      app.decorate("kafkaConsumer", consumer)
      app.addHook("onClose", async () => consumer.disconnect())
    }
  },
  {}
)

export interface KafkaPluginOptions {
  consumer?: KafkaBatchConsumerConfig
  producer?: KafkaProducerConfig
  prometheusMeter?: PrometheusMeter
  connect?: boolean
}

type Plugin = import("fastify").Plugin<
  HttpServer,
  HttpRequest,
  HttpResponse,
  KafkaPluginOptions
>
type HttpServer =
  | import("http").Server
  | import("http2").Http2Server
  | import("http2").Http2SecureServer
  | import("https").Server
type HttpRequest =
  | import("http").IncomingMessage
  | import("http2").Http2ServerRequest
type HttpResponse =
  | import("http").ServerResponse
  | import("http2").Http2ServerResponse

declare module "fastify" {
  interface FastifyInstance {
    kafkaConsumer?: KafkaBatchConsumer
    kafkaProducer?: KafkaProducer
    prometheusMeter?: PrometheusMeter
  }
}
