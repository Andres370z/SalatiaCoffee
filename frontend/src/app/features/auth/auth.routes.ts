import { Routes } from '@angular/router';

import { ROUTE_PATHS } from '@routes/route-paths';
import { FirstAdminPageComponent } from './pages/first-admin/first-admin-page.component';
import { LoginPageComponent } from './pages/login/login-page.component';

export const AUTH_ROUTES: Routes = [
  { path: ROUTE_PATHS.root, pathMatch: 'full', redirectTo: ROUTE_PATHS.auth.login },
  { path: ROUTE_PATHS.auth.login, title: 'Iniciar sesión', component: LoginPageComponent },
  {
    path: ROUTE_PATHS.auth.firstAdmin,
    title: 'Primer administrador',
    component: FirstAdminPageComponent,
  },
];
