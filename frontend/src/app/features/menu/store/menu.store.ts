import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Observable, forkJoin, tap } from 'rxjs';

import { ApiError } from '@core/models/api-error.model';
import { SessionService } from '@core/services/session.service';
import { Category, Product, ProductInput } from '../models/product.model';
import { MenuService } from '../services/menu.service';

export interface ProductGroup {
  category: string;
  products: Product[];
}

/**
 * Store del menú: única fuente de verdad de productos y categorías.
 * Vive mientras la aplicación está abierta (en memoria): al volver a la pantalla del menú no se
 * vuelve a pedir la lista. Se vacía solo al cerrar sesión, así un usuario nuevo nunca ve datos del anterior.
 * No usa el almacenamiento del navegador a propósito: los precios y la disponibilidad cambian y
 * una copia guardada podría mostrar datos viejos.
 */
@Injectable({ providedIn: 'root' })
export class MenuStore {
  private readonly api = inject(MenuService);
  private readonly session = inject(SessionService);

  private readonly productsState = signal<Product[]>([]);
  private readonly categoriesState = signal<Category[]>([]);
  private readonly loadedState = signal(false);
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly togglingIdState = signal<number | null>(null);
  private readonly errorState = signal<string | null>(null);

  readonly products = this.productsState.asReadonly();
  readonly categories = this.categoriesState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly togglingId = this.togglingIdState.asReadonly();
  readonly error = this.errorState.asReadonly();

  /** Productos agrupados por categoría, en el orden en que los entrega la API. */
  readonly groups = computed<ProductGroup[]>(() => {
    const groups: ProductGroup[] = [];
    for (const product of this.productsState()) {
      const group = groups.find((g) => g.category === product.categoria);
      if (group) group.products.push(product);
      else groups.push({ category: product.categoria, products: [product] });
    }
    return groups;
  });

  constructor() {
    // Al cerrar sesión se descarta todo lo guardado.
    effect(
      () => {
        if (!this.session.isAuthenticated()) this.reset();
      },
      { allowSignalWrites: true },
    );
  }

  /** Carga productos y categorías. Si ya están cargados no hace nada, salvo con `force`. */
  load(force = false): void {
    if (this.loadingState() || (this.loadedState() && !force)) return;
    this.loadingState.set(true);
    this.errorState.set(null);
    forkJoin({ products: this.api.listProducts(), categories: this.api.listCategories() }).subscribe({
      next: ({ products, categories }) => {
        this.productsState.set(products);
        this.categoriesState.set(categories);
        this.loadedState.set(true);
        this.loadingState.set(false);
      },
      error: (error: ApiError) => {
        this.errorState.set(error.message);
        this.loadingState.set(false);
      },
    });
  }

  /** Crea un producto (sin `id`) o edita uno existente. El error lo maneja quien llama. */
  save(input: ProductInput, id: number | null): Observable<Product> {
    this.savingState.set(true);
    const request = id === null ? this.api.create(input) : this.api.update(id, input);
    return request.pipe(
      tap({
        next: (product) => {
          this.upsert(product);
          this.savingState.set(false);
        },
        error: () => this.savingState.set(false),
      }),
    );
  }

  /** Cambia entre disponible y agotado. */
  toggleAvailable(product: Product): void {
    this.togglingIdState.set(product.id);
    this.api.update(product.id, { disponible: !product.disponible }).subscribe({
      next: (updated) => {
        this.upsert(updated);
        this.togglingIdState.set(null);
        this.errorState.set(null);
      },
      error: (error: ApiError) => {
        this.errorState.set(error.message);
        this.togglingIdState.set(null);
      },
    });
  }

  private upsert(product: Product): void {
    this.productsState.update((list) =>
      list.some((p) => p.id === product.id)
        ? list.map((p) => (p.id === product.id ? product : p))
        : [...list, product],
    );
  }

  private reset(): void {
    this.productsState.set([]);
    this.categoriesState.set([]);
    this.loadedState.set(false);
    this.loadingState.set(false);
    this.savingState.set(false);
    this.togglingIdState.set(null);
    this.errorState.set(null);
  }
}
