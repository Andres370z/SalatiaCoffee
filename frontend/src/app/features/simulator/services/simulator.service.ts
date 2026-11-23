import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ENDPOINTS, buildApiUrl } from '@constants/api.constants';
import {
  SimulatorMessageResponse,
  SimulatorOrderRequest,
  SimulatorOrderResponse,
} from '../models/simulator.model';

/** Herramientas de prueba del backend (no existen en producción). */
@Injectable({ providedIn: 'root' })
export class SimulatorService {
  private readonly http = inject(HttpClient);

  /** Envía un mensaje como si lo escribiera un cliente por WhatsApp. */
  sendMessage(phone: string, text: string): Observable<SimulatorMessageResponse> {
    return this.http.post<SimulatorMessageResponse>(buildApiUrl(API_ENDPOINTS.simulator.message), {
      telefono: phone,
      texto: text,
    });
  }

  /** Crea un pedido de una vez, sin conversar con el bot. */
  createOrder(request: SimulatorOrderRequest): Observable<SimulatorOrderResponse> {
    return this.http.post<SimulatorOrderResponse>(buildApiUrl(API_ENDPOINTS.simulator.order), request);
  }
}
