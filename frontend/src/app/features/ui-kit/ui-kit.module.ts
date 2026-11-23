import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { SharedModule } from '@shared/shared.module';
import { UiKitPageComponent } from './pages/ui-kit/ui-kit-page.component';
import { UI_KIT_ROUTES } from './ui-kit.routes';

@NgModule({
  declarations: [UiKitPageComponent],
  imports: [CommonModule, SharedModule, RouterModule.forChild(UI_KIT_ROUTES)],
})
export class UiKitModule {}
