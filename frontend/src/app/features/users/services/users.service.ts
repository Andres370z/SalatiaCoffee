import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ENDPOINTS, buildApiUrl } from '@constants/api.constants';
import { NewUserInput, PanelUser } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);

  /** Crea un usuario del panel (solo administrador). */
  create(input: NewUserInput): Observable<PanelUser> {
    return this.http.post<PanelUser>(buildApiUrl(API_ENDPOINTS.users.base), input);
  }
}
