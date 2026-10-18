/**
 * A binary min-heap of integer ranks: `push` and `pop` in logarithmic time, so
 * picking the earliest-seen ready event stays linearithmic however the
 * fragments interleave.
 */
export const createRankQueue = () => {
  const heap: number[] = []
  const swap = (left: number, right: number) => {
    const held = heap[left] ?? 0
    heap[left] = heap[right] ?? 0
    heap[right] = held
  }
  return {
    size: () => heap.length,
    push: (rank: number) => {
      heap.push(rank)
      let index = heap.length - 1
      while (index > 0) {
        const parent = (index - 1) >> 1
        if ((heap[parent] ?? 0) <= rank) break
        swap(parent, index)
        index = parent
      }
    },
    pop: () => {
      const top = heap[0]
      const last = heap.pop()
      if (heap.length > 0 && last !== undefined) {
        heap[0] = last
        let index = 0
        for (;;) {
          const left = index * 2 + 1
          const right = left + 1
          let smallest = index
          if (left < heap.length && (heap[left] ?? 0) < (heap[smallest] ?? 0))
            smallest = left
          if (right < heap.length && (heap[right] ?? 0) < (heap[smallest] ?? 0))
            smallest = right
          if (smallest === index) break
          swap(smallest, index)
          index = smallest
        }
      }
      return top
    },
  }
}
