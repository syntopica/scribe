export type ConversationPathInspection =
  | { kind: 'skip' }
  | { kind: 'file'; path: string }
  | { kind: 'directory'; paths: string[] }
