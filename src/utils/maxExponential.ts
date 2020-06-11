export default function maxExponential(
  max: number,
  exponent: number,
  base = 2
) {
  const maxExponent = Math.log(max) / Math.log(base)
  if (exponent >= maxExponent) {
    return max
  }
  return base ** exponent
}
