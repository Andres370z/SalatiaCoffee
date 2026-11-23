import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { CoreModule } from '@core/core.module';
import { authTokenInterceptor } from '@core/interceptors/auth-token.interceptor';
import { httpErrorInterceptor } from '@core/interceptors/http-error.interceptor';
import { AppRoutingModule } from '@routes/app-routing.module';
import { SharedModule } from '@shared/shared.module';
import { AppComponent } from './app.component';

/** Módulo raíz: arranca la aplicación y registra lo que se usa en todas partes. */
@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, CoreModule, SharedModule, AppRoutingModule],
  providers: [provideHttpClient(withInterceptors([authTokenInterceptor, httpErrorInterceptor]))],
  bootstrap: [AppComponent],
})
export class AppModule {}
