import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { ClaimTimelineEvent } from '../models';

@Component({
  selector: 'claim-timeline-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface border border-line rounded-lg shadow-1">
      <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line">
        <h3 class="text-[13px] font-semibold m-0">Línea de tiempo del caso</h3>
      </div>
      <div class="px-5 py-5">
        <div class="timeline">
          @for (t of events(); track $index) {
            <div class="tl-item" [attr.data-tone]="t.tone">
              <div class="text-[11.5px] text-ink-3 tabular-nums">{{ t.date }}</div>
              <div class="font-medium text-[13.5px] mt-0.5">{{ t.title }}</div>
              @if (t.desc) {
                <div class="text-[12.5px] text-ink-3 mt-1">{{ t.desc }}</div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class TimelineCard {
  readonly events = input.required<readonly ClaimTimelineEvent[]>();
}
