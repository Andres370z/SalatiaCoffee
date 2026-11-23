import { Routes } from '@angular/router';

import { ROUTE_PATHS } from '@routes/route-paths';
import { UiKitPageComponent } from './pages/ui-kit/ui-kit-page.component';

export const UI_KIT_ROUTES: Routes = [
  { path: ROUTE_PATHS.root, title: 'UI Kit', component: UiKitPageComponent },
];
