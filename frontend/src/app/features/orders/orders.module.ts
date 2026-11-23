import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { SharedModule } from '@shared/shared.module';
import { OrderTicketComponent } from './components/order-ticket/order-ticket.component';
import { StatusBadgeComponent } from './components/status-badge/status-badge.component';
import { ORDERS_ROUTES } from './orders.routes';
import { OrderDetailPageComponent } from './pages/order-detail/order-detail-page.component';
import { OrdersBoardPageComponent } from './pages/orders-board/orders-board-page.component';

@NgModule({
  declarations: [
    OrdersBoardPageComponent,
    OrderDetailPageComponent,
    OrderTicketComponent,
    StatusBadgeComponent,
  ],
  imports: [CommonModule, SharedModule, RouterModule.forChild(ORDERS_ROUTES)],
})
export class OrdersModule {}
