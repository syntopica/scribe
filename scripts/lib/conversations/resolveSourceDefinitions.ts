import { resolveSecondaryDesktopDir } from '../machine/instance/resolveSecondaryDesktopDir'
import type { ConversationSourceDefinition } from './types/ConversationSourceDefinition'

export const resolveSourceDefinitions = (
  env: NodeJS.ProcessEnv,
): readonly ConversationSourceDefinition[] => [
  {
    id: 'claude-code',
    label: 'Claude Code',
    roots: [
      '.claude/projects',
      'Library/Application Support/Claude/local-agent-mode-sessions',
      // A second desktop profile writes beside the first one under the same
      // account uuid, and those sessions are captured by nothing until this
      // root is listed.
      `Library/Application Support/${resolveSecondaryDesktopDir(env)}/local-agent-mode-sessions`,
    ],
    storage: ['jsonl', 'json'],
  },
  {
    id: 'codex',
    label: 'Codex',
    roots: [
      '.codex/sessions',
      '.codex/archived_sessions',
      '.codex/session-archive',
    ],
    storage: ['jsonl'],
  },
  {
    id: 'continue',
    label: 'Continue',
    roots: ['.continue/sessions'],
    storage: ['json'],
  },
  {
    id: 'cursor',
    label: 'Cursor',
    roots: [
      'Library/Application Support/Cursor/User/workspaceStorage',
      'Library/Application Support/Cursor/User/globalStorage/state.vscdb',
      '.config/Cursor/User/workspaceStorage',
      '.config/Cursor/User/globalStorage/state.vscdb',
    ],
    storage: ['sqlite'],
  },
  {
    id: 'gemini',
    label: 'Gemini CLI',
    roots: ['.gemini/tmp'],
    storage: ['json'],
  },
  {
    id: 'hermes',
    label: 'Hermes',
    roots: ['.hermes/sessions'],
    storage: ['json', 'jsonl'],
  },
  {
    id: 'omp',
    label: 'Oh My Pi',
    roots: ['.omp', '.local/share/omp'],
    storage: ['json', 'jsonl'],
  },
  {
    id: 'openclaw',
    label: 'OpenClaw',
    roots: ['.openclaw'],
    storage: ['json', 'jsonl'],
  },
  {
    id: 'opencode',
    label: 'OpenCode',
    roots: [
      '.local/share/opencode/opencode.db',
      '.local/share/opencode/storage/session',
      '.local/share/opencode/storage/message',
      '.local/share/opencode/storage/part',
      'Library/Application Support/opencode/opencode.db',
      'Library/Application Support/opencode/storage/session',
      'Library/Application Support/opencode/storage/message',
      'Library/Application Support/opencode/storage/part',
      '.local/share/ai.opencode.app',
      'Library/Application Support/ai.opencode.app',
    ],
    storage: ['json', 'jsonl', 'sqlite', 'tauri'],
  },
  {
    id: 'pi',
    label: 'Pi',
    roots: ['.pi/agent/sessions'],
    storage: ['json', 'jsonl'],
  },
  {
    // Probed 2026-08-31: the roots below hold VS Code editor state and no
    // dialogue. Trae's assistant history is in
    // `Library/Application Support/Trae/ModularData/ai-agent/database.db`,
    // 15 MB and written live, but it has no SQLite header and is opaque -
    // encrypted at rest - so an exporter is blocked on decryption, not on
    // discovery. These roots stay because they are where a future plaintext
    // export would land.
    id: 'trae',
    label: 'Trae',
    roots: [
      'Library/Application Support/Trae/User/workspaceStorage',
      '.config/Trae/User/workspaceStorage',
      '.trae',
    ],
    storage: ['json', 'jsonl', 'sqlite'],
  },
  {
    id: 'treechat',
    label: 'Treechat',
    roots: ['.local/share/rocket-agents/treechat'],
    storage: ['json', 'jsonl'],
  },
  {
    // Probed 2026-08-31: no local dialogue store exists. Every cascade or chat
    // key in these databases holds UI state under 80 bytes, and `~/.codeium`
    // carries only `global_rules.md`, so Cascade history is kept server-side.
    id: 'windsurf',
    label: 'Windsurf',
    roots: [
      'Library/Application Support/Windsurf/User/workspaceStorage',
      'Library/Application Support/Windsurf/User/globalStorage/state.vscdb',
      '.config/Windsurf/User/workspaceStorage',
      '.config/Windsurf/User/globalStorage/state.vscdb',
    ],
    storage: ['sqlite'],
  },
]
