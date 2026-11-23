import { CommonModule } from '@angular/common';
import { ErrorHandler, NgModule, Optional, SkipSelf } from '@angular/core';
import { RouterModule } from '@angular/router';

import { GlobalErrorHandler } from './errors/global-error-handler';
import { NotFoundPageComponent } from './pages/not-found/not-found-page.component';

/** Piezas únicas de la aplicación (manejo global de errores, página 404). Solo lo importa AppModule. */
@NgModule({
  declarations: [NotFoundPageComponent],
  imports: [CommonModule, RouterModule],
  exports: [NotFoundPageComponent],
  providers: [{ provide: ErrorHandler, useClass: GlobalErrorHandler }],
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parent: CoreModule | null) {
    if (parent) throw new Error('CoreModule solo se importa una vez, en AppModule.');
  }
}
