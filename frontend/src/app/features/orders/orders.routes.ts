import { Routes } from '@angular/router';

import { ROUTE_PATHS } from '@routes/route-paths';
import { OrderDetailPageComponent } from './pages/order-detail/order-detail-page.component';
import { OrdersBoardPageComponent } from './pages/orders-board/orders-board-page.component';

export const ORDERS_ROUTES: Routes = [
  { path: ROUTE_PATHS.root, title: 'Pedidos', component: OrdersBoardPageComponent },
  { path: ROUTE_PATHS.orders.detail, title: 'Detalle del pedido', component: OrderDetailPageComponent },
];
