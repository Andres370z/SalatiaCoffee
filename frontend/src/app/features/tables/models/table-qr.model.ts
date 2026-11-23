/** Respuesta de `GET /mesas/:id/qr`. */
export interface TableQr {
  id_mesa: number;
  numero: number;
  activa: boolean;
  /** Texto que el cliente envía por WhatsApp, por ejemplo «MESA-3». */
  texto: string;
  /** Enlace wa.me con el texto ya escrito. */
  enlace: string;
}
