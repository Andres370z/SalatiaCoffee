import { Injectable, computed, inject, signal } from '@angular/core';

import { STORAGE_KEYS } from '@constants/storage.constants';
import { SessionUser, UserRole } from '@core/models/session-user.model';
import { StorageService } from './storage.service';

/** Estado global de la sesión (token y usuario). Lo consultan los guards y los interceptores. */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly storage = inject(StorageService);

  private readonly tokenState = signal<string | null>(this.storage.get(STORAGE_KEYS.authToken));
  private readonly userState = signal<SessionUser | null>(
    this.storage.getJson<SessionUser>(STORAGE_KEYS.sessionUser),
  );

  readonly token = this.tokenState.asReadonly();
  readonly user = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => this.tokenState() !== null);

  start(token: string, user: SessionUser): void {
    this.storage.set(STORAGE_KEYS.authToken, token);
    this.storage.setJson(STORAGE_KEYS.sessionUser, user);
    this.tokenState.set(token);
    this.userState.set(user);
  }

  clear(): void {
    this.storage.remove(STORAGE_KEYS.authToken);
    this.storage.remove(STORAGE_KEYS.sessionUser);
    this.tokenState.set(null);
    this.userState.set(null);
  }

  hasRole(...roles: UserRole[]): boolean {
    const user = this.userState();
    return user !== null && roles.includes(user.rol);
  }
}
