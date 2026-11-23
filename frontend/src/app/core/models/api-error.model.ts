/** Error de la API ya normalizado por el interceptor HTTP. */
export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}
