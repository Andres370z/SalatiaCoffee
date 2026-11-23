import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { UserRole } from '@core/models/session-user.model';
import { SessionService } from '@core/services/session.service';
import { APP_URLS } from '@routes/route-paths';

/**
 * Permite el paso solo a los roles indicados. Uso: `canActivate: [roleGuard('administrador')]`.
 * Sin sesión envía al inicio de sesión; con sesión pero sin permiso, a la raíz.
 */
export const roleGuard =
  (...roles: UserRole[]): CanActivateFn =>
  () => {
    const session = inject(SessionService);
    const router = inject(Router);
    if (!session.isAuthenticated()) return router.createUrlTree([APP_URLS.login]);
    return session.hasRole(...roles) ? true : router.createUrlTree([APP_URLS.root]);
  };
