import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ENDPOINTS, buildApiUrl } from '@constants/api.constants';
import { TableQr } from '../models/table-qr.model';

@Injectable({ providedIn: 'root' })
export class TablesService {
  private readonly http = inject(HttpClient);

  /** Enlace de WhatsApp de una mesa (el que va en el QR). */
  getQr(tableId: number): Observable<TableQr> {
    return this.http.get<TableQr>(buildApiUrl(API_ENDPOINTS.tables.qr(tableId)));
  }
}
