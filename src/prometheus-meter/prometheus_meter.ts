import promClient from "prom-client"
import * as promMeter from "../prometheus-meter-interface"

export function createPrometheusMeter(
  defaultRegisters: promClient.Registry[] = [promClient.register],
  Counter = promClient.Counter,
  Gauge = promClient.Gauge,
  Histogram = promClient.Histogram,
  Summary = promClient.Summary,
): promMeter.PrometheusMeter {
  return {
    createCounter<Labels extends string>(
      config: promMeter.CounterConfiguration<Labels>,
    ): promMeter.Counter<Labels> {
      return new Counter<Labels>({ registers: defaultRegisters, ...config })
    },

    createGauge<Labels extends string>(
      config: promMeter.GaugeConfiguration<Labels>,
    ): promMeter.Gauge<Labels> {
      return new Gauge<Labels>({ registers: defaultRegisters, ...config })
    },

    createHistogram<Labels extends string>(
      config: promMeter.HistogramConfiguration<Labels>,
    ): promMeter.Histogram<Labels> {
      return new Histogram<Labels>({ registers: defaultRegisters, ...config })
    },

    createSummary<Labels extends string>(
      config: promMeter.SummaryConfiguration<Labels>,
    ): promMeter.Summary<Labels> {
      return new Summary<Labels>({ registers: defaultRegisters, ...config })
    },
  }
}
