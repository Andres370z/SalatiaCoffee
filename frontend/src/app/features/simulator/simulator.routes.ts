import { Routes } from '@angular/router';

import { ROUTE_PATHS } from '@routes/route-paths';
import { SimulatorPageComponent } from './pages/simulator/simulator-page.component';

export const SIMULATOR_ROUTES: Routes = [
  { path: ROUTE_PATHS.root, title: 'Simulador', component: SimulatorPageComponent },
];
