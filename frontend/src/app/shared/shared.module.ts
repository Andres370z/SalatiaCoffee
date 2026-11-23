import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { AlertComponent } from './components/alert/alert.component';
import { EmptyStateComponent } from './components/empty-state/empty-state.component';
import { IconComponent } from './components/icon/icon.component';
import { AppShellComponent } from './layout/app-shell/app-shell.component';
import { CopPipe } from './pipes/cop.pipe';
import { HoraPipe } from './pipes/hora.pipe';

const PIECES = [AlertComponent, EmptyStateComponent, IconComponent, AppShellComponent, CopPipe, HoraPipe];

/** Componentes y pipes reutilizables. Cada módulo de función que los necesite importa SharedModule. */
@NgModule({
  declarations: PIECES,
  imports: [CommonModule, RouterModule],
  exports: PIECES,
})
export class SharedModule {}
