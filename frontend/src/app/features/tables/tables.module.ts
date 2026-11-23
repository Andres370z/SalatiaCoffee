import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { SharedModule } from '@shared/shared.module';
import { TablesPageComponent } from './pages/tables/tables-page.component';
import { TABLES_ROUTES } from './tables.routes';

@NgModule({
  declarations: [TablesPageComponent],
  imports: [CommonModule, ReactiveFormsModule, SharedModule, RouterModule.forChild(TABLES_ROUTES)],
})
export class TablesModule {}
