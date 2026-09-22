export const flagValues = (argv: string[], name: string): string[] =>
  argv.flatMap((value, index, values) => {
    const candidate = values[index + 1]
    return value === name && candidate !== undefined ? [candidate] : []
  })
