import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { APP_NAME } from '@constants/app.constants';
import { ApiError } from '@core/models/api-error.model';
import { SessionService } from '@core/services/session.service';
import { APP_URLS } from '@routes/route-paths';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  protected readonly appName = APP_NAME;
  protected readonly firstAdminUrl = APP_URLS.firstAdmin;
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.group({
    usuario: ['', [Validators.required]],
    contrasena: ['', [Validators.required]],
  });

  constructor() {
    if (this.session.isAuthenticated()) void this.router.navigateByUrl(APP_URLS.orders);
  }

  protected showError(name: 'usuario' | 'contrasena'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => void this.router.navigateByUrl(APP_URLS.orders),
      error: (error: ApiError) => {
        this.error.set(error.message);
        this.loading.set(false);
      },
    });
  }
}
