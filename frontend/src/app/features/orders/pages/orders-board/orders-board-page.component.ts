import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, merge, of, switchMap, timer } from 'rxjs';

import { APP_TIME_ZONE, ORDERS_REFRESH_MS } from '@constants/app.constants';
import { ApiError } from '@core/models/api-error.model';
import { SearchService, normalizeSearch } from '@core/services/search.service';
import { OrderStateRequest } from '../../components/order-ticket/order-ticket.component';
import { IN_PROGRESS_STATES, ORDER_FILTERS, Order, OrderFilter } from '../../models/order.model';
import { OrdersService } from '../../services/orders.service';

export type OrdersScope = 'hoy' | 'todos';

const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIME_ZONE });

/** Día (AAAA-MM-DD) de una fecha, en la zona horaria del negocio. */
function dayOf(date: string | Date): string {
  return dayFormatter.format(new Date(date));
}

@Component({
  selector: 'app-orders-board-page',
  templateUrl: './orders-board-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersBoardPageComponent {
  private readonly orders = inject(OrdersService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly search = inject(SearchService);

  protected readonly filters = ORDER_FILTERS;
  protected readonly refresh$ = new Subject<void>();

  protected readonly list = signal<Order[]>([]);
  protected readonly filter = signal<OrderFilter>('en_curso');
  /** «Hoy» = solo los pedidos del día; «Todos» = el historial completo. */
  protected readonly scope = signal<OrdersScope>('hoy');
  protected readonly scopes: { id: OrdersScope; label: string }[] = [
    { id: 'hoy', label: 'Hoy' },
    { id: 'todos', label: 'Todos los días' },
  ];
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busyId = signal<number | null>(null);

  /** Pedidos del alcance elegido (hoy o todos). */
  private readonly scoped = computed(() => {
    if (this.scope() === 'todos') return this.list();
    const today = dayOf(new Date());
    return this.list().filter((o) => dayOf(o.creado_en) === today);
  });

  /** Pedidos del alcance que cumplen el buscador de la barra superior (número, mesa, producto u observación). */
  private readonly searched = computed(() => {
    const term = normalizeSearch(this.search.term());
    if (!term) return this.scoped();
    return this.scoped().filter((o) => {
      const text = [
        String(o.id),
        o.mesa ? `mesa ${o.mesa.numero}` : o.tipo,
        o.observaciones ?? '',
        ...o.items.map((item) => `${item.nombre} ${item.nota ?? ''}`),
      ].join(' ');
      return normalizeSearch(text).includes(term);
    });
  });

  protected readonly visible = computed(() => this.searched().filter((o) => this.matches(o, this.filter())));
  protected readonly counts = computed(() => {
    const result = {} as Record<OrderFilter, number>;
    for (const f of ORDER_FILTERS) result[f.id] = this.searched().filter((o) => this.matches(o, f.id)).length;
    return result;
  });

  constructor() {
    this.search.enableFor(this.destroyRef, 'Buscar por mesa, número o producto…');
    merge(timer(0, ORDERS_REFRESH_MS), this.refresh$)
      .pipe(
        switchMap(() =>
          // Siempre la lista completa: así cambiar de filtro nunca hace desaparecer pedidos.
          this.orders.list().pipe(
            catchError((error: ApiError) => {
              this.error.set(error.message);
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((list) => {
        this.loading.set(false);
        if (list) {
          this.list.set(list);
          this.error.set(null);
        }
      });
  }

  protected changeState({ id, state }: OrderStateRequest): void {
    this.busyId.set(id);
    this.orders.changeStatus(id, state).subscribe({
      next: (result) => {
        this.list.update((list) => list.map((o) => (o.id === id ? { ...o, estado: result.estado } : o)));
        this.busyId.set(null);
        this.error.set(null);
      },
      error: (error: ApiError) => {
        this.error.set(error.message);
        this.busyId.set(null);
        this.refresh$.next();
      },
    });
  }

  private matches(order: Order, filter: OrderFilter): boolean {
    if (filter === 'todos') return true;
    if (filter === 'en_curso') return IN_PROGRESS_STATES.includes(order.estado);
    return order.estado === filter;
  }
}
