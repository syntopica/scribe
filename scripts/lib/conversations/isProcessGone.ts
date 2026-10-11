/**
 * Say whether no process with this id exists, without disturbing one that
 * does.
 *
 * Signal 0 tests for the process and delivers nothing. EPERM means the process
 * exists and belongs to someone else, which is still alive; only ESRCH says
 * nothing is there. A recycled id reads as alive, which is the safe direction
 * for every caller: they reclaim only what is provably orphaned.
 */
export const isProcessGone = (pid: number) => {
  try {
    process.kill(pid, 0)
    return false
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'ESRCH'
  }
}
