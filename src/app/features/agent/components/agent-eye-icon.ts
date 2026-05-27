import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'agent-eye-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="agent-eye"
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7Z"
        stroke="white"
        stroke-width="2"
        stroke-linejoin="round"
      />
      @if (tracking()) {
        <circle cx="12" cy="12" r="3" stroke="white" stroke-width="2">
          <animate
            attributeName="cx"
            dur="2.6s"
            repeatCount="indefinite"
            calcMode="spline"
            keyTimes="0;0.2;0.45;0.7;0.9;1"
            keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1"
            values="12;9.2;14.2;13;10;12"
          />
          <animate
            attributeName="cy"
            dur="2.6s"
            repeatCount="indefinite"
            calcMode="spline"
            keyTimes="0;0.2;0.45;0.7;0.9;1"
            keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1"
            values="12;10.8;12.2;11;12.6;12"
          />
        </circle>
      } @else {
        <circle cx="12" cy="12" r="3" stroke="white" stroke-width="2" />
      }
    </svg>
  `,
  styles: [
    `
      .agent-eye {
        display: block;
        overflow: visible;
      }
    `,
  ],
})
export class AgentEyeIcon {
  readonly size = input<number>(14);
  readonly tracking = input<boolean>(false);
}
