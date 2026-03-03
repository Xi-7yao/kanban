export const boardKeys = {
    all: ['board'] as const,
    columns: () => [...boardKeys.all, 'columns'] as const,
    taskSearch: (q: string) => [...boardKeys.all, 'search', q] as const,
};