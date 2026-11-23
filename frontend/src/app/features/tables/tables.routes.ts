import { Routes } from '@angular/router';

import { ROUTE_PATHS } from '@routes/route-paths';
import { TablesPageComponent } from './pages/tables/tables-page.component';

export const TABLES_ROUTES: Routes = [
  { path: ROUTE_PATHS.root, title: 'Mesas', component: TablesPageComponent },
];
