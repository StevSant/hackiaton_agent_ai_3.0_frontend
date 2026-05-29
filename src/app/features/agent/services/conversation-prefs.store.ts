import { Injectable, signal } from '@angular/core';

/**
 * Local (per-browser) conversation preferences: pinned chats + an emoji tag per
 * conversation. Persisted in localStorage so they survive reloads without a
 * backend column — the Conversation table has no pin/reaction fields, and adding
 * one mid-hackathon isn't worth a migration. Keyed by conversation id.
 */
@Injectable({ providedIn: 'root' })
export class ConversationPrefsStore {
  /** Emojis offered as quick "reactions" to tag a conversation for reference. */
  static readonly PALETTE = ['⭐', '🔴', '🟡', '🟢', '⚠️', '👁️', '🔎', '✅'];

  private static readonly PIN_KEY = 'centinela.pinnedConversations';
  private static readonly EMOJI_KEY = 'centinela.conversationEmojis';

  private readonly _pinned = signal<ReadonlySet<string>>(this.loadPinned());
  private readonly _emojis = signal<Readonly<Record<string, string>>>(this.loadEmojis());

  readonly pinned = this._pinned.asReadonly();
  readonly emojis = this._emojis.asReadonly();

  isPinned(id: string): boolean {
    return this._pinned().has(id);
  }

  togglePin(id: string): void {
    const next = new Set(this._pinned());
    next.has(id) ? next.delete(id) : next.add(id);
    this._pinned.set(next);
    this.persist(ConversationPrefsStore.PIN_KEY, [...next]);
  }

  emojiFor(id: string): string | null {
    return this._emojis()[id] ?? null;
  }

  /** Set the emoji tag; re-selecting the same emoji clears it (toggle). */
  setEmoji(id: string, emoji: string): void {
    const next = { ...this._emojis() };
    if (next[id] === emoji) delete next[id];
    else next[id] = emoji;
    this._emojis.set(next);
    this.persist(ConversationPrefsStore.EMOJI_KEY, next);
  }

  private loadPinned(): ReadonlySet<string> {
    const raw = this.read(ConversationPrefsStore.PIN_KEY);
    return new Set(Array.isArray(raw) ? (raw as string[]) : []);
  }

  private loadEmojis(): Record<string, string> {
    const raw = this.read(ConversationPrefsStore.EMOJI_KEY);
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, string>) : {};
  }

  private read(key: string): unknown {
    if (typeof localStorage === 'undefined') return null;
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  }

  private persist(key: string, value: unknown): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage full / disabled — preferences just won't persist this session.
    }
  }
}
