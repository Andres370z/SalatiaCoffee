import { SessionUser } from '@core/models/session-user.model';

export interface LoginRequest {
  usuario: string;
  contrasena: string;
}

/** Cuerpo de `POST /auth/primer-admin`. */
export interface FirstAdminRequest {
  clave_inicial: string;
  nombre: string;
  usuario: string;
  contrasena: string;
}

/** Respuesta de `POST /auth/login`. */
export interface LoginResponse {
  token: string;
  expira_en: string;
  usuario: SessionUser;
}
