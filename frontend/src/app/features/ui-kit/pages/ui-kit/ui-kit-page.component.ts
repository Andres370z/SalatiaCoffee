import { Component } from '@angular/core';

import { APP_NAME } from '@constants/app.constants';
import { APP_URLS } from '@routes/route-paths';

/** Catálogo del sistema de diseño: los mismos estilos que usan las pantallas reales. */
@Component({
  selector: 'app-ui-kit-page',
  templateUrl: './ui-kit-page.component.html',
})
export class UiKitPageComponent {
  protected readonly nombreApp = APP_NAME;
  protected readonly urls = APP_URLS;
}
