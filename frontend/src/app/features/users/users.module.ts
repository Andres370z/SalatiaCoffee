import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { SharedModule } from '@shared/shared.module';
import { UsersPageComponent } from './pages/users/users-page.component';
import { USERS_ROUTES } from './users.routes';

@NgModule({
  declarations: [UsersPageComponent],
  imports: [CommonModule, ReactiveFormsModule, SharedModule, RouterModule.forChild(USERS_ROUTES)],
})
export class UsersModule {}
