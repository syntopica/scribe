export const flagValue = (argv: string[], name: string) => {
  const index = argv.indexOf(name)

  if (index === -1) {
    return undefined
  }

  return argv[index + 1]
}
