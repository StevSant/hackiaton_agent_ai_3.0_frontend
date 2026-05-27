export type TimelineTone = 'ok' | 'warn' | 'danger';

export interface ClaimTimelineEvent {
  date: string;
  title: string;
  tone: TimelineTone;
  desc?: string;
}
