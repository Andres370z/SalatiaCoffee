import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';

import { ApiError } from '@core/models/api-error.model';
import { APP_URLS } from '@routes/route-paths';
import { OrderStateRequest } from '../../components/order-ticket/order-ticket.component';
import { ORDER_STATE_META, OrderDetail } from '../../models/order.model';
import { OrdersService } from '../../services/orders.service';

/** Detalle de un pedido: la comanda, sus acciones y el historial de cambios de estado. */
@Component({
  selector: 'app-order-detail-page',
  templateUrl: './order-detail-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailPageComponent {
  private readonly orders = inject(OrdersService);

  /** Viene de la ruta `/orders/:id`. */
  readonly id = input.required<string>();

  protected readonly backUrl = APP_URLS.orders;
  protected readonly meta = ORDER_STATE_META;
  protected readonly order = signal<OrderDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => this.load(Number(this.id())), { allowSignalWrites: true });
  }

  protected changeState({ id, state }: OrderStateRequest): void {
    this.busy.set(true);
    this.orders.changeStatus(id, state).subscribe({
      next: () => {
        this.busy.set(false);
        this.load(id);
      },
      error: (error: ApiError) => {
        this.error.set(error.message);
        this.busy.set(false);
        this.load(id);
      },
    });
  }

  private load(id: number): void {
    if (!Number.isInteger(id) || id <= 0) {
      this.error.set('El número de pedido no es válido.');
      this.loading.set(false);
      return;
    }
    this.orders.getById(id).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loading.set(false);
      },
      error: (error: ApiError) => {
        this.error.set(error.message);
        this.loading.set(false);
      },
    });
  }
}
