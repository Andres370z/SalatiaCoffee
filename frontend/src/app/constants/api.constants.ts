/** URL base del backend (Node.js + Express). Cámbiala aquí al desplegar. */
export const API_BASE_URL = 'http://localhost:3000';

/** Rutas de la API (colección de Postman en docs/postman). Los servicios las usan; ningún otro archivo escribe rutas a mano. */
export const API_ENDPOINTS = {
  health: '/salud',
  auth: {
    login: '/auth/login',
    firstAdmin: '/auth/primer-admin',
  },
  orders: {
    base: '/pedidos',
    byId: (id: number) => `/pedidos/${id}`,
    status: (id: number) => `/pedidos/${id}/estado`,
  },
  products: {
    base: '/productos',
    byId: (id: number) => `/productos/${id}`,
  },
  categories: {
    base: '/categorias',
  },
  users: {
    base: '/usuarios',
  },
  tables: {
    qr: (id: number) => `/mesas/${id}/qr`,
  },
  /** Solo existen mientras el backend no corre en producción. */
  simulator: {
    message: '/simulador/mensaje',
    order: '/simulador/pedido',
  },
} as const;

/** Construye la URL completa de un endpoint. */
export function buildApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}
