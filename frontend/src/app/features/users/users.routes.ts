import { Routes } from '@angular/router';

import { ROUTE_PATHS } from '@routes/route-paths';
import { UsersPageComponent } from './pages/users/users-page.component';

export const USERS_ROUTES: Routes = [
  { path: ROUTE_PATHS.root, title: 'Usuarios', component: UsersPageComponent },
];
