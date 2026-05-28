export type ChatContext =
  | { kind: 'claim'; id: string }
  | { kind: 'provider'; id: string }
  | { kind: 'asegurado'; id: string }
  | null;
