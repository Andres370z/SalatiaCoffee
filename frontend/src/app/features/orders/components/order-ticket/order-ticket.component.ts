import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { APP_URLS } from '@routes/route-paths';
import { ORDER_ACTIONS, Order, OrderState } from '../../models/order.model';

export interface OrderStateRequest {
  id: number;
  state: OrderState;
}

/** La comanda: mesa, productos con puntos guía, total y, bajo la línea de corte, las acciones del personal. */
@Component({
  selector: 'app-order-ticket',
  templateUrl: './order-ticket.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderTicketComponent {
  readonly order = input.required<Order>();
  readonly busy = input(false);
  /** Muestra el enlace «Ver detalle e historial» (se oculta en la propia página de detalle). */
  readonly showDetailLink = input(true);
  protected readonly detailUrl = computed(() => APP_URLS.orderDetail(this.order().id));
  readonly stateRequested = output<OrderStateRequest>();

  protected readonly confirmingCancel = signal(false);
  protected readonly actions = computed(() => ORDER_ACTIONS[this.order().estado]);
  protected readonly isNew = computed(() => this.order().estado === 'recibido');
  protected readonly title = computed(() => {
    const { mesa, tipo } = this.order();
    if (mesa) return `Mesa ${mesa.numero}`;
    return tipo === 'domicilio' ? 'Domicilio' : 'Pedido';
  });

  protected onAction(state: OrderState): void {
    if (state === 'cancelado') this.confirmingCancel.set(true);
    else this.request(state);
  }

  protected request(state: OrderState): void {
    this.confirmingCancel.set(false);
    this.stateRequested.emit({ id: this.order().id, state });
  }
}
