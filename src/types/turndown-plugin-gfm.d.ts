// turndown-plugin-gfm ships no type definitions. Minimal declaration covering
// the GFM bundle we use (tables, strikethrough) in the document canvas.
declare module 'turndown-plugin-gfm' {
  import type TurndownService from 'turndown';
  export type TurndownPlugin = TurndownService.Plugin;
  export const gfm: TurndownPlugin;
  export const tables: TurndownPlugin;
  export const strikethrough: TurndownPlugin;
  export const taskListItems: TurndownPlugin;
}
