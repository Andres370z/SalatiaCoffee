import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SessionService } from '@core/services/session.service';
import { APP_URLS } from '@routes/route-paths';

/** Permite el paso solo con sesión iniciada; si no, envía al inicio de sesión. */
export const authGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);
  return session.isAuthenticated() ? true : router.createUrlTree([APP_URLS.login]);
};
