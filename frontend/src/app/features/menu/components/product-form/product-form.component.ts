import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import { Category, Product, ProductInput } from '../../models/product.model';

type FieldName = 'nombre' | 'precio' | 'id_categoria';

/** Formulario para crear o editar un producto (solo lo ve el administrador). */
@Component({
  selector: 'app-product-form',
  templateUrl: './product-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFormComponent {
  readonly product = input<Product | null>(null);
  readonly categories = input.required<Category[]>();
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  readonly saved = output<ProductInput>();
  readonly cancelled = output<void>();

  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    descripcion: [''],
    precio: [0, [Validators.required, Validators.min(0)]],
    id_categoria: [0, [Validators.required, Validators.min(1)]],
    disponible: [true],
  });

  constructor() {
    effect(() => {
      const product = this.product();
      this.form.reset({
        nombre: product?.nombre ?? '',
        descripcion: product?.descripcion ?? '',
        precio: product?.precio ?? 0,
        id_categoria: product?.id_categoria ?? 0,
        disponible: product?.disponible ?? true,
      });
    });
  }

  protected invalid(name: FieldName): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.saved.emit({
      nombre: value.nombre.trim(),
      descripcion: value.descripcion.trim() || null,
      precio: Number(value.precio),
      id_categoria: value.id_categoria,
      disponible: value.disponible,
    });
  }
}
