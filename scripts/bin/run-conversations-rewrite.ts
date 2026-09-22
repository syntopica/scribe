import { main } from '../commands/conversationsRewrite'
import { reportUnexpectedFailure } from '../lib/reportUnexpectedFailure'

main().catch((error: unknown) => {
  reportUnexpectedFailure(
    'Conversation archive rewrite failed unexpectedly',
    error,
  )
})
