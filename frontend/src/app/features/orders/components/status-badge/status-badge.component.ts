import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ORDER_STATE_META, OrderState } from '../../models/order.model';

/** Insignia de estado: icono + palabra + color. */
@Component({
  selector: 'app-status-badge',
  templateUrl: './status-badge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  readonly state = input.required<OrderState>();
  protected readonly meta = computed(() => ORDER_STATE_META[this.state()]);
}
