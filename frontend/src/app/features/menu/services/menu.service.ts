import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ENDPOINTS, buildApiUrl } from '@constants/api.constants';
import { Category, Product, ProductInput } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly http = inject(HttpClient);

  listProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(buildApiUrl(API_ENDPOINTS.products.base));
  }

  listCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(buildApiUrl(API_ENDPOINTS.categories.base));
  }

  create(input: ProductInput): Observable<Product> {
    return this.http.post<Product>(buildApiUrl(API_ENDPOINTS.products.base), input);
  }

  update(id: number, input: Partial<ProductInput>): Observable<Product> {
    return this.http.put<Product>(buildApiUrl(API_ENDPOINTS.products.byId(id)), input);
  }
}
