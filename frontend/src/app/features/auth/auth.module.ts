import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { SharedModule } from '@shared/shared.module';
import { AUTH_ROUTES } from './auth.routes';
import { FirstAdminPageComponent } from './pages/first-admin/first-admin-page.component';
import { LoginPageComponent } from './pages/login/login-page.component';

@NgModule({
  declarations: [LoginPageComponent, FirstAdminPageComponent],
  imports: [CommonModule, ReactiveFormsModule, SharedModule, RouterModule.forChild(AUTH_ROUTES)],
})
export class AuthModule {}
