import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { authGuard } from '@core/guards/auth.guard';
import { roleGuard } from '@core/guards/role.guard';
import { NotFoundPageComponent } from '@core/pages/not-found/not-found-page.component';
import { AppShellComponent } from '@shared/layout/app-shell/app-shell.component';
import { INITIAL_ROUTE, ROUTE_PATHS } from './route-paths';

/**
 * Rutas principales. Cada módulo de función se carga bajo demanda (lazy loading).
 * Pedidos y menú viven dentro del marco con barra lateral y exigen sesión iniciada.
 */
export const appRoutes: Routes = [
  { path: ROUTE_PATHS.root, pathMatch: 'full', redirectTo: INITIAL_ROUTE },
  {
    path: ROUTE_PATHS.auth.base,
    loadChildren: () => import('@features/auth/auth.module').then((m) => m.AuthModule),
  },
  {
    path: ROUTE_PATHS.root,
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: ROUTE_PATHS.orders.base,
        loadChildren: () => import('@features/orders/orders.module').then((m) => m.OrdersModule),
      },
      {
        path: ROUTE_PATHS.menu.base,
        loadChildren: () => import('@features/menu/menu.module').then((m) => m.MenuModule),
      },
      {
        path: ROUTE_PATHS.tables.base,
        loadChildren: () => import('@features/tables/tables.module').then((m) => m.TablesModule),
      },
      {
        path: ROUTE_PATHS.users.base,
        canActivate: [roleGuard('administrador')],
        loadChildren: () => import('@features/users/users.module').then((m) => m.UsersModule),
      },
      {
        path: ROUTE_PATHS.simulator.base,
        canActivate: [roleGuard('administrador')],
        loadChildren: () =>
          import('@features/simulator/simulator.module').then((m) => m.SimulatorModule),
      },
    ],
  },
  {
    path: ROUTE_PATHS.uiKit.base,
    loadChildren: () => import('@features/ui-kit/ui-kit.module').then((m) => m.UiKitModule),
  },
  { path: ROUTE_PATHS.notFound, title: 'Página no encontrada', component: NotFoundPageComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(appRoutes, { bindToComponentInputs: true })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
