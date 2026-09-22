import { main } from '../commands/conversationsCapture'
import { reportUnexpectedFailure } from '../lib/reportUnexpectedFailure'

main().catch((error: unknown) => {
  reportUnexpectedFailure('Conversation capture failed unexpectedly', error)
})
