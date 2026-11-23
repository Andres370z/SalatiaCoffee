import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { API_ENDPOINTS, buildApiUrl } from '@constants/api.constants';

export type HealthState = 'ok' | 'database-error' | 'offline';

/** Respuesta de `GET /salud`. */
interface HealthResponse {
  servidor: string;
  baseDeDatos: string;
}

@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly http = inject(HttpClient);

  /** Comprueba que el servidor y la base de datos responden. Nunca falla: devuelve el estado. */
  check(): Observable<HealthState> {
    return this.http.get<HealthResponse>(buildApiUrl(API_ENDPOINTS.health)).pipe(
      map((health): HealthState => (health.baseDeDatos === 'ok' ? 'ok' : 'database-error')),
      catchError((error: { status?: number; details?: HealthResponse }) =>
        of<HealthState>(error.status === 500 && error.details?.servidor === 'ok' ? 'database-error' : 'offline'),
      ),
    );
  }
}
