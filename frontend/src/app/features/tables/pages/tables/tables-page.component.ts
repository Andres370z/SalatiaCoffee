import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import { ApiError } from '@core/models/api-error.model';
import { TableQr } from '../../models/table-qr.model';
import { TablesService } from '../../services/tables.service';

/** Consulta el enlace de WhatsApp de una mesa para imprimirlo como QR. */
@Component({
  selector: 'app-tables-page',
  templateUrl: './tables-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TablesPageComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly tables = inject(TablesService);

  protected readonly form = this.fb.group({
    id: [1, [Validators.required, Validators.min(1)]],
  });
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly result = signal<TableQr | null>(null);
  protected readonly copied = signal(false);

  protected search(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);
    this.copied.set(false);
    this.tables.getQr(Number(this.form.controls.id.value)).subscribe({
      next: (qr) => {
        this.result.set(qr);
        this.loading.set(false);
      },
      error: (error: ApiError) => {
        this.error.set(error.message);
        this.loading.set(false);
      },
    });
  }

  protected async copyLink(link: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(link);
      this.copied.set(true);
    } catch {
      this.error.set('No se pudo copiar. Selecciona el enlace y cópialo a mano.');
    }
  }
}
