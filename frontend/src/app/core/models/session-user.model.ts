export type UserRole = 'administrador' | 'personal';

/** Usuario con sesión iniciada, tal como lo devuelve `POST /auth/login`. */
export interface SessionUser {
  id: number;
  nombre: string;
  usuario: string;
  rol: UserRole;
}
