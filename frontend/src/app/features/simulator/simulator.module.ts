import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { SharedModule } from '@shared/shared.module';
import { SimulatorPageComponent } from './pages/simulator/simulator-page.component';
import { SIMULATOR_ROUTES } from './simulator.routes';

@NgModule({
  declarations: [SimulatorPageComponent],
  imports: [CommonModule, ReactiveFormsModule, SharedModule, RouterModule.forChild(SIMULATOR_ROUTES)],
})
export class SimulatorModule {}
