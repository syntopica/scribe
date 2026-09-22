import { main } from '../commands/conversationsDoctor'
import { reportUnexpectedFailure } from '../lib/reportUnexpectedFailure'

main().catch((error: unknown) => {
  reportUnexpectedFailure('Conversation doctor failed unexpectedly', error)
})
