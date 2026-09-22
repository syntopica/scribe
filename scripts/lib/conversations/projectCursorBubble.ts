export const projectCursorBubble = (bubble: Record<string, unknown>) => {
  const role =
    bubble['type'] === 1 || bubble['type'] === 'user' ? 'user' : 'assistant'
  return {
    role,
    content: bubble['text'],
    type: bubble['type'],
    text: bubble['text'],
    modelId: bubble['modelId'] ?? bubble['model'],
    context: bubble['context'],
    codeBlocks: bubble['codeBlocks'],
    suggestedCodeBlocks: bubble['suggestedCodeBlocks'],
    toolResults: bubble['toolResults'],
    diffHistories: bubble['diffHistories'],
    timestamp: bubble['timestamp'] ?? bubble['createdAt'],
  }
}
