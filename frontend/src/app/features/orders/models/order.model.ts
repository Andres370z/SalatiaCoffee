import { IconName } from '@shared/components/icon/icon.component';

export type OrderState = 'recibido' | 'en_preparacion' | 'listo' | 'entregado' | 'cancelado';

export interface OrderItem {
  id_producto: number;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  nota: string | null;
}

/** Pedido tal como lo devuelve `GET /pedidos`. */
export interface Order {
  id: number;
  estado: OrderState;
  tipo: 'local' | 'domicilio';
  observaciones: string | null;
  total: number;
  creado_en: string;
  mesa: { id: number; numero: number } | null;
  items: OrderItem[];
}

/** Un cambio de estado del pedido y quién lo hizo (`usuario` es null si lo hizo el sistema). */
export interface OrderHistoryEntry {
  estado: OrderState;
  cambiado_en: string;
  usuario: string | null;
}

/** Respuesta de `GET /pedidos/:id`. */
export interface OrderDetail extends Order {
  historial: OrderHistoryEntry[];
}

export interface OrderStateMeta {
  label: string;
  icon: IconName;
  /** Clases del par fondo/tinta del estado (DESIGN.md, "Estados del pedido"). */
  badgeClass: string;
}

export const ORDER_STATE_META: Record<OrderState, OrderStateMeta> = {
  recibido: { label: 'Recibido', icon: 'bell', badgeClass: 'bg-terracotta-tint text-terracotta-ink' },
  en_preparacion: { label: 'En preparación', icon: 'flame', badgeClass: 'bg-honey-tint text-honey-ink' },
  listo: { label: 'Listo', icon: 'check', badgeClass: 'bg-sage-tint text-sage-ink' },
  entregado: { label: 'Entregado', icon: 'bag', badgeClass: 'bg-neutral-tint text-neutral-ink' },
  cancelado: { label: 'Cancelado', icon: 'x', badgeClass: 'bg-cherry-tint text-cherry-ink' },
};

export interface OrderAction {
  to: OrderState;
  label: string;
  kind: 'primary' | 'danger';
}

/** Acciones permitidas desde cada estado (espejo de la máquina de estados del backend). */
export const ORDER_ACTIONS: Record<OrderState, OrderAction[]> = {
  recibido: [
    { to: 'en_preparacion', label: 'Empezar a preparar', kind: 'primary' },
    { to: 'cancelado', label: 'Cancelar pedido', kind: 'danger' },
  ],
  en_preparacion: [{ to: 'listo', label: 'Marcar como listo', kind: 'primary' }],
  listo: [{ to: 'entregado', label: 'Marcar como entregado', kind: 'primary' }],
  entregado: [],
  cancelado: [],
};

/** Filtros del tablero: un estado, los pedidos en curso o todos. */
export type OrderFilter = 'en_curso' | OrderState | 'todos';

export const ORDER_FILTERS: { id: OrderFilter; label: string }[] = [
  { id: 'en_curso', label: 'En curso' },
  { id: 'recibido', label: 'Recibidos' },
  { id: 'en_preparacion', label: 'En preparación' },
  { id: 'listo', label: 'Listos' },
  { id: 'entregado', label: 'Entregados' },
  { id: 'cancelado', label: 'Cancelados' },
  { id: 'todos', label: 'Todos' },
];

export const IN_PROGRESS_STATES: readonly OrderState[] = ['recibido', 'en_preparacion', 'listo'];
