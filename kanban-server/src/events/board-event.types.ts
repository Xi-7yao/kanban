export type BoardEvent =
  | { type: 'card:created'; card: { id: number; title: string; content?: string; columnId: number; order: number } }
  | { type: 'card:updated'; cardId: number; changes: Record<string, any> }
  | { type: 'card:deleted'; cardId: number; columnId: number }
  | { type: 'card:moved'; cardId: number; fromColumnId: number; toColumnId: number; order: number }
  | { type: 'column:created'; column: { id: number; title: string; order: number } }
  | { type: 'column:updated'; columnId: number; changes: Record<string, any> }
  | { type: 'column:deleted'; columnId: number }
  | { type: 'user:editing'; cardId: number }
  | { type: 'user:stopEditing'; cardId: number };
