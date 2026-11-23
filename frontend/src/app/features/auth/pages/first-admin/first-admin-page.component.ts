import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import { APP_NAME } from '@constants/app.constants';
import { ApiError } from '@core/models/api-error.model';
import { APP_URLS } from '@routes/route-paths';
import { AuthService } from '../../services/auth.service';

type FieldName = 'clave_inicial' | 'nombre' | 'usuario' | 'contrasena';

/** Crea el primer administrador con la clave inicial del .env del backend (ADMIN_INICIAL_TOKEN). */
@Component({
  selector: 'app-first-admin-page',
  templateUrl: './first-admin-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FirstAdminPageComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);

  protected readonly appName = APP_NAME;
  protected readonly loginUrl = APP_URLS.login;
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly createdUser = signal<string | null>(null);

  protected readonly form = this.fb.group({
    clave_inicial: ['', [Validators.required]],
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    usuario: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9._-]{3,60}$/)]],
    contrasena: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(200)]],
  });

  protected invalid(name: FieldName): boolean {
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
    this.auth.createFirstAdmin(this.form.getRawValue()).subscribe({
      next: (user) => {
        this.createdUser.set(user.usuario);
        this.loading.set(false);
      },
      error: (error: ApiError) => {
        this.error.set(error.message);
        this.loading.set(false);
      },
    });
  }
}
