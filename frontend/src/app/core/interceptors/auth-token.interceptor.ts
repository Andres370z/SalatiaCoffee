import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { API_BASE_URL } from '@constants/api.constants';
import { SessionService } from '@core/services/session.service';

/** Agrega el token de sesión (Bearer) a las peticiones dirigidas a nuestra API. */
export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(SessionService).token();
  if (token === null || !request.url.startsWith(API_BASE_URL)) {
    return next(request);
  }
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
