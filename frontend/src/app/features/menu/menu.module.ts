import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { SharedModule } from '@shared/shared.module';
import { ProductFormComponent } from './components/product-form/product-form.component';
import { MENU_ROUTES } from './menu.routes';
import { MenuListPageComponent } from './pages/menu-list/menu-list-page.component';

@NgModule({
  declarations: [MenuListPageComponent, ProductFormComponent],
  imports: [CommonModule, ReactiveFormsModule, SharedModule, RouterModule.forChild(MENU_ROUTES)],
})
export class MenuModule {}
