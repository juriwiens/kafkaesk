import type promClient from "prom-client"

/**
 * A PrometheusMeter is a metric factory and inspired by the OpenTelemetry Metrics Meter concept.
 * It enables libraries to only depend on this interface instead of concrete prom-client implementation.
 */
export interface PrometheusMeter {
  createCounter<Labels extends string>(
    config: promClient.CounterConfiguration<Labels>,
  ): promClient.Counter<Labels>
  createGauge<Labels extends string>(
    config: promClient.GaugeConfiguration<Labels>,
  ): promClient.Gauge<Labels>
  createHistogram<Labels extends string>(
    config: promClient.HistogramConfiguration<Labels>,
  ): promClient.Histogram<Labels>
  createSummary<Labels extends string>(
    config: promClient.SummaryConfiguration<Labels>,
  ): promClient.Summary<Labels>
}

export type {
  Counter,
  CounterConfiguration,
  Gauge,
  GaugeConfiguration,
  Histogram,
  HistogramConfiguration,
  Summary,
  SummaryConfiguration,
} from "prom-client"
