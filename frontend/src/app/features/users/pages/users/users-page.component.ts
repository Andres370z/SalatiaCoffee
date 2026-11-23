import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import { ApiError } from '@core/models/api-error.model';
import { PanelUser, ROLE_LABELS } from '../../models/user.model';
import { UsersService } from '../../services/users.service';

type FieldName = 'usuario' | 'nombre' | 'contrasena';

/** Crear usuarios del panel. El backend no tiene listado, así que se muestran los creados en esta sesión. */
@Component({
  selector: 'app-users-page',
  templateUrl: './users-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersPageComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly users = inject(UsersService);

  protected readonly roleLabels = ROLE_LABELS;
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly created = signal<PanelUser[]>([]);

  protected readonly form = this.fb.group({
    usuario: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9._-]{3,60}$/)]],
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    contrasena: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(200)]],
    rol: ['personal' as 'personal' | 'administrador'],
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
    this.saving.set(true);
    this.error.set(null);
    const value = this.form.getRawValue();
    this.users.create({ ...value, usuario: value.usuario.trim(), nombre: value.nombre.trim() }).subscribe({
      next: (user) => {
        this.created.update((list) => [user, ...list]);
        this.form.reset({ usuario: '', nombre: '', contrasena: '', rol: 'personal' });
        this.saving.set(false);
      },
      error: (error: ApiError) => {
        this.error.set(error.message);
        this.saving.set(false);
      },
    });
  }
}
