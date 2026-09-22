import { main } from '../commands/conversationsRender'
import { reportUnexpectedFailure } from '../lib/reportUnexpectedFailure'

main().catch((error: unknown) => {
  reportUnexpectedFailure('Conversation render failed unexpectedly', error)
})
