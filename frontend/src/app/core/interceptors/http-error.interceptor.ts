import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { API_BASE_URL, API_ENDPOINTS } from '@constants/api.constants';
import { ApiError } from '@core/models/api-error.model';
import { SessionService } from '@core/services/session.service';
import { APP_URLS } from '@routes/route-paths';

const HTTP_UNAUTHORIZED = 401;
const MENSAJE_SIN_CONEXION = 'No hay conexión con el servidor.';
const MENSAJE_GENERICO = 'Ocurrió un error inesperado.';

/** El backend responde los errores como `{ "error": "mensaje" }`. */
function toApiError(error: HttpErrorResponse): ApiError {
  const body = error.error as { error?: unknown } | null;
  const message =
    typeof body?.error === 'string'
      ? body.error
      : error.status === 0
        ? MENSAJE_SIN_CONEXION
        : MENSAJE_GENERICO;
  return { status: error.status, message, details: error.error };
}

/** Normaliza los errores de la API y cierra la sesión si el servidor responde 401 (sesión vencida). */
export const httpErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(SessionService);
  const router = inject(Router);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }
      const esNuestraApi = request.url.startsWith(API_BASE_URL);
      const esLogin = request.url.endsWith(API_ENDPOINTS.auth.login);
      if (error.status === HTTP_UNAUTHORIZED && esNuestraApi && !esLogin) {
        session.clear();
        void router.navigateByUrl(APP_URLS.login);
      }
      return throwError(() => toApiError(error));
    }),
  );
};
