/*
 * Solo se exportan los paths. `app.routes.ts` se importa directamente desde `app.config.ts`:
 * exportarlo aquí crearía un ciclo (rutas → features → rutas).
 */
export * from './route-paths';
