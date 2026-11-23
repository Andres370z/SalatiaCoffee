/** Producto tal como lo devuelve `GET /productos`. */
export interface Product {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  disponible: boolean;
  id_categoria: number;
  categoria: string;
}

/** Categoría de `GET /categorias`. */
export interface Category {
  id: number;
  nombre: string;
  orden: number;
}

/** Cuerpo de `POST /productos` y `PUT /productos/:id` (en la edición todos los campos son opcionales). */
export interface ProductInput {
  nombre: string;
  descripcion: string | null;
  precio: number;
  id_categoria: number;
  disponible: boolean;
}
