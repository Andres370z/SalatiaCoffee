import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { switchMap, timer } from 'rxjs';

import { APP_NAME } from '@constants/app.constants';
import { UserRole } from '@core/models/session-user.model';
import { HealthService, HealthState } from '@core/services/health.service';
import { SearchService } from '@core/services/search.service';
import { SessionService } from '@core/services/session.service';
import { APP_URLS } from '@routes/route-paths';
import { IconName } from '../../components/icon/icon.component';

interface NavItem {
  label: string;
  url: string;
  icon: IconName;
  /** Si se indica, solo estos roles ven el enlace. */
  roles?: UserRole[];
}

const HEALTH_CHECK_MS = 30_000;

const HEALTH_LABELS: Record<HealthState, string> = {
  ok: 'Servidor conectado',
  'database-error': 'Servidor sin base de datos',
  offline: 'Sin conexión con el servidor',
};

const MAIN_ITEMS: NavItem[] = [
  { label: 'Pedidos', url: APP_URLS.orders, icon: 'bell' },
  { label: 'Menú', url: APP_URLS.menu, icon: 'cup' },
];

const MANAGE_ITEMS: NavItem[] = [
  { label: 'Mesas', url: APP_URLS.tables, icon: 'list' },
  { label: 'Usuarios', url: APP_URLS.users, icon: 'plus', roles: ['administrador'] },
  { label: 'Simulador', url: APP_URLS.simulator, icon: 'flame', roles: ['administrador'] },
];

/**
 * Marco de las pantallas con sesión: barra lateral, barra superior (buscador y usuario) y contenido.
 * En pantallas angostas la barra lateral pasa a una franja superior.
 */
@Component({
  selector: 'app-shell',
  templateUrl: './app-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly health = inject(HealthService);
  protected readonly search = inject(SearchService);

  protected readonly appName = APP_NAME;
  protected readonly user = this.session.user;
  protected readonly initial = computed(() => (this.user()?.nombre ?? '?').trim().charAt(0).toUpperCase());

  protected readonly mainNav = MAIN_ITEMS;
  protected readonly manageNav = computed(() =>
    MANAGE_ITEMS.filter((item) => !item.roles || this.session.hasRole(...item.roles)),
  );

  protected readonly healthState = signal<HealthState | null>(null);
  protected readonly healthLabel = computed(() => {
    const state = this.healthState();
    return state ? HEALTH_LABELS[state] : 'Comprobando servidor…';
  });

  constructor() {
    timer(0, HEALTH_CHECK_MS)
      .pipe(
        switchMap(() => this.health.check()),
        takeUntilDestroyed(),
      )
      .subscribe((state) => this.healthState.set(state));
  }

  protected onSearch(event: Event): void {
    this.search.term.set((event.target as HTMLInputElement).value);
  }

  protected logout(): void {
    this.session.clear();
    void this.router.navigateByUrl(APP_URLS.login);
  }
}
