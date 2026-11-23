import { Routes } from '@angular/router';

import { ROUTE_PATHS } from '@routes/route-paths';
import { MenuListPageComponent } from './pages/menu-list/menu-list-page.component';

export const MENU_ROUTES: Routes = [
  { path: ROUTE_PATHS.root, title: 'Menú', component: MenuListPageComponent },
];
