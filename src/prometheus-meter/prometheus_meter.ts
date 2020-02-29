import promClient from "prom-client"
import type {PrometheusMeter} from "../prometheus-meter-interface"

export function createPrometheusMeter(
  defaultRegisters: promClient.Registry[] = [promClient.register],
  Counter = promClient.Counter,
  Gauge = promClient.Gauge,
  Histogram = promClient.Histogram,
  Summary = promClient.Summary,
): PrometheusMeter {
  return {
    createCounter<Labels extends string>(
      config: promClient.CounterConfiguration<Labels>,
    ): promClient.Counter<Labels> {
      return new Counter<Labels>({ registers: defaultRegisters, ...config })
    },

    createGauge<Labels extends string>(
      config: promClient.GaugeConfiguration<Labels>,
    ): promClient.Gauge<Labels> {
      return new Gauge<Labels>({ registers: defaultRegisters, ...config })
    },

    createHistogram<Labels extends string>(
      config: promClient.HistogramConfiguration<Labels>,
    ): promClient.Histogram<Labels> {
      return new Histogram<Labels>({ registers: defaultRegisters, ...config })
    },

    createSummary<Labels extends string>(
      config: promClient.SummaryConfiguration<Labels>,
    ): promClient.Summary<Labels> {
      return new Summary<Labels>({ registers: defaultRegisters, ...config })
    },
  }
}
