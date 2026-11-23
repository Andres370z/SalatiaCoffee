/** Fragmentos de ruta (los que van en la configuración del router). */
export const ROUTE_PATHS = {
  root: '',
  auth: { base: 'auth', login: 'login', firstAdmin: 'primer-admin' },
  menu: { base: 'menu' },
  orders: { base: 'orders', detail: ':id' },
  users: { base: 'users' },
  tables: { base: 'tables' },
  simulator: { base: 'simulator' },
  uiKit: { base: 'ui-kit' },
  notFound: '**',
} as const;

/** Ruta a la que redirige la raíz. Si no hay sesión, el guard envía al inicio de sesión. */
export const INITIAL_ROUTE = ROUTE_PATHS.orders.base;

/** Rutas absolutas para navegar (routerLink, router.navigate, guards). */
export const APP_URLS = {
  root: '/',
  login: `/${ROUTE_PATHS.auth.base}/${ROUTE_PATHS.auth.login}`,
  firstAdmin: `/${ROUTE_PATHS.auth.base}/${ROUTE_PATHS.auth.firstAdmin}`,
  menu: `/${ROUTE_PATHS.menu.base}`,
  orders: `/${ROUTE_PATHS.orders.base}`,
  orderDetail: (id: number) => `/${ROUTE_PATHS.orders.base}/${id}`,
  users: `/${ROUTE_PATHS.users.base}`,
  tables: `/${ROUTE_PATHS.tables.base}`,
  simulator: `/${ROUTE_PATHS.simulator.base}`,
  uiKit: `/${ROUTE_PATHS.uiKit.base}`,
} as const;
