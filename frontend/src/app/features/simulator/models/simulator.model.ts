/** Respuesta de `POST /simulador/mensaje`. `respuesta` es lo que el bot le escribiría al cliente. */
export interface SimulatorMessageResponse {
  telefono: string;
  respuesta: unknown;
}

/** Cuerpo de `POST /simulador/pedido` (sin `items` pide 1 unidad del primer producto disponible). */
export interface SimulatorOrderRequest {
  telefono: string;
  mesa: number;
}

/** Respuesta de `POST /simulador/pedido`. */
export interface SimulatorOrderResponse {
  id: number;
  total: number;
  mesa: number;
}

/** Una línea de la conversación simulada. */
export interface ChatLine {
  from: 'cliente' | 'bot';
  text: string;
}
