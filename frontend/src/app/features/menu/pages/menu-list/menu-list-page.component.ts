import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';

import { ApiError } from '@core/models/api-error.model';
import { SearchService, normalizeSearch } from '@core/services/search.service';
import { SessionService } from '@core/services/session.service';
import { Product, ProductInput } from '../../models/product.model';
import { MenuStore, ProductGroup } from '../../store/menu.store';

/** Menú: todos lo consultan; solo el administrador crea, edita y marca agotados. Los datos viven en MenuStore. */
@Component({
  selector: 'app-menu-list-page',
  templateUrl: './menu-list-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuListPageComponent {
  protected readonly store = inject(MenuStore);
  protected readonly isAdmin = inject(SessionService).hasRole('administrador');

  private readonly search = inject(SearchService);

  protected readonly formOpen = signal(false);
  protected readonly editing = signal<Product | null>(null);
  protected readonly formError = signal<string | null>(null);

  /** Categoría elegida en los filtros; `null` = todas. */
  protected readonly categoryId = signal<number | null>(null);

  /** Productos que cumplen el filtro de categoría y el buscador, agrupados por categoría. */
  protected readonly groups = computed<ProductGroup[]>(() => {
    const term = normalizeSearch(this.search.term());
    const categoryId = this.categoryId();
    const groups: ProductGroup[] = [];
    for (const product of this.store.products()) {
      if (categoryId !== null && product.id_categoria !== categoryId) continue;
      if (term && !normalizeSearch(`${product.nombre} ${product.descripcion ?? ''}`).includes(term)) continue;
      const group = groups.find((g) => g.category === product.categoria);
      if (group) group.products.push(product);
      else groups.push({ category: product.categoria, products: [product] });
    }
    return groups;
  });

  protected readonly summary = computed(() => {
    const products = this.store.products();
    const available = products.filter((p) => p.disponible).length;
    return { total: products.length, available, soldOut: products.length - available };
  });

  constructor() {
    this.search.enableFor(inject(DestroyRef), 'Buscar producto…');
    this.store.load();
  }

  protected openForm(product: Product | null): void {
    this.editing.set(product);
    this.formError.set(null);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
  }

  protected save(input: ProductInput): void {
    this.formError.set(null);
    this.store.save(input, this.editing()?.id ?? null).subscribe({
      next: () => this.closeForm(),
      error: (error: ApiError) => this.formError.set(error.message),
    });
  }
}
