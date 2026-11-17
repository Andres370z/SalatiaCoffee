-- SalatiaCoffee - Migración 01 (Sprint 1, HU-01)
-- Estado de la conversación de cada cliente en WhatsApp.
-- Aplicar después de schema.sql:
--   psql -U <usuario> -d salatiacoffee -f database/migracion_01_sesion_chat.sql

CREATE TABLE IF NOT EXISTS sesion_chat (
    id              SERIAL PRIMARY KEY,
    telefono        VARCHAR(20) NOT NULL UNIQUE,
    estado          VARCHAR(30) NOT NULL DEFAULT 'inicio',
    id_mesa         INTEGER REFERENCES mesa(id),
    carrito         JSONB NOT NULL
                    DEFAULT '{"items": [], "seleccion": null}'::jsonb,
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- carrito.items: [{id_producto, nombre, cantidad, nota}]
--   El precio NO se guarda aquí: se recalcula en el servidor al confirmar.
-- carrito.seleccion: {id_categoria, id_producto, cantidad} | null
--   Lo que el cliente está eligiendo en este momento.
-- estado: inicio | autorizacion | categoria | producto | cantidad |
--         observacion | agregar_mas | resumen
--   Se valida en el código (sin CHECK) para no migrar cada vez que cambie un paso del bot.
