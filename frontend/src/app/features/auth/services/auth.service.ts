import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { API_ENDPOINTS, buildApiUrl } from '@constants/api.constants';
import { SessionService } from '@core/services/session.service';
import { SessionUser } from '@core/models/session-user.model';
import { FirstAdminRequest, LoginRequest, LoginResponse } from '../models/login.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);

  /** Inicia sesión y guarda el token y el usuario. */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(buildApiUrl(API_ENDPOINTS.auth.login), credentials)
      .pipe(tap((response) => this.session.start(response.token, response.usuario)));
  }

  /** Crea el primer administrador (solo si no hay usuarios y con la clave inicial del backend). */
  createFirstAdmin(request: FirstAdminRequest): Observable<SessionUser> {
    return this.http.post<SessionUser>(buildApiUrl(API_ENDPOINTS.auth.firstAdmin), request);
  }

  logout(): void {
    this.session.clear();
  }
}
