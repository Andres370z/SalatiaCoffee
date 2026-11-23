import { UserRole } from '@core/models/session-user.model';

/** Usuario del panel tal como lo devuelve `POST /usuarios`. */
export interface PanelUser {
  id: number;
  nombre: string;
  usuario: string;
  rol: UserRole;
  activo: boolean;
}

/** Cuerpo de `POST /usuarios`. */
export interface NewUserInput {
  usuario: string;
  nombre: string;
  contrasena: string;
  rol: UserRole;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  administrador: 'Administrador',
  personal: 'Personal',
};
