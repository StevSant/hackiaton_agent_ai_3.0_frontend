/** Maps a column key to the comparable value it sorts by, per row. */
export type SortAccessors<T> = Record<string, (row: T) => string | number | null | undefined>;
