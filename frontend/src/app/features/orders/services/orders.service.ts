import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ENDPOINTS, buildApiUrl } from '@constants/api.constants';
import { Order, OrderDetail, OrderState } from '../models/order.model';

/** Máximo de pedidos por consulta que acepta el backend. */
const MAX_ORDERS = 500;

export interface OrderStatusChange {
  id: number;
  estado: OrderState;
  estado_anterior: OrderState;
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);

  /**
   * Pedidos de un día (AAAA-MM-DD), del más antiguo al más nuevo.
   * Sin fecha devuelve el historial completo (hasta el máximo que permite el backend).
   */
  list(date?: string): Observable<Order[]> {
    let params = new HttpParams().set('limite', MAX_ORDERS);
    if (date) params = params.set('fecha', date);
    return this.http.get<Order[]>(buildApiUrl(API_ENDPOINTS.orders.base), { params });
  }

  /** Un pedido con su historial de estados. */
  getById(id: number): Observable<OrderDetail> {
    return this.http.get<OrderDetail>(buildApiUrl(API_ENDPOINTS.orders.byId(id)));
  }

  changeStatus(id: number, status: OrderState): Observable<OrderStatusChange> {
    return this.http.patch<OrderStatusChange>(buildApiUrl(API_ENDPOINTS.orders.status(id)), {
      estado: status,
    });
  }
}
