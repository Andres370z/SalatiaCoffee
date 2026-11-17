-- SalatiaCoffee - Esquema de base de datos (PostgreSQL 16)
-- Entidades del diseño integral: Mesa, Categoria, Producto, Cliente,
-- UsuarioPersonal, Pedido, DetallePedido e HistorialEstado.

CREATE TABLE mesa (
    id          SERIAL PRIMARY KEY,
    numero      INTEGER NOT NULL UNIQUE,
    codigo_qr   TEXT,
    activa      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE categoria (
    id      SERIAL PRIMARY KEY,
    nombre  VARCHAR(80) NOT NULL UNIQUE,
    orden   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE producto (
    id            SERIAL PRIMARY KEY,
    nombre        VARCHAR(120) NOT NULL,
    descripcion   TEXT,
    precio        NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
    disponible    BOOLEAN NOT NULL DEFAULT TRUE,
    id_categoria  INTEGER NOT NULL REFERENCES categoria(id)
);

CREATE TABLE cliente (
    id                   SERIAL PRIMARY KEY,
    telefono             VARCHAR(20) NOT NULL UNIQUE,
    nombre               VARCHAR(120),
    autoriza_datos       BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_autorizacion   TIMESTAMPTZ
);

CREATE TABLE usuario_personal (
    id               SERIAL PRIMARY KEY,
    nombre           VARCHAR(120) NOT NULL,
    usuario          VARCHAR(60) NOT NULL UNIQUE,
    contrasena_hash  TEXT NOT NULL,
    rol              VARCHAR(20) NOT NULL CHECK (rol IN ('administrador', 'personal')),
    activo           BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE pedido (
    id             SERIAL PRIMARY KEY,
    id_cliente     INTEGER NOT NULL REFERENCES cliente(id),
    id_mesa        INTEGER REFERENCES mesa(id),
    tipo           VARCHAR(10) NOT NULL CHECK (tipo IN ('local', 'domicilio')),
    estado         VARCHAR(20) NOT NULL DEFAULT 'recibido'
                   CHECK (estado IN ('recibido', 'en_preparacion', 'listo', 'entregado', 'cancelado')),
    observaciones  TEXT,
    total          NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Un pedido en el local siempre tiene mesa
    CONSTRAINT pedido_local_con_mesa CHECK (tipo <> 'local' OR id_mesa IS NOT NULL)
);

CREATE TABLE detalle_pedido (
    id               SERIAL PRIMARY KEY,
    id_pedido        INTEGER NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
    id_producto      INTEGER NOT NULL REFERENCES producto(id),
    cantidad         INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario  NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0),
    nota             TEXT
);

CREATE TABLE historial_estado (
    id          SERIAL PRIMARY KEY,
    id_pedido   INTEGER NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
    estado      VARCHAR(20) NOT NULL,
    cambiado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    id_usuario  INTEGER REFERENCES usuario_personal(id)
);

CREATE INDEX idx_pedido_estado ON pedido(estado);
CREATE INDEX idx_pedido_creado_en ON pedido(creado_en);
CREATE INDEX idx_producto_categoria ON producto(id_categoria);
CREATE INDEX idx_detalle_pedido ON detalle_pedido(id_pedido);
CREATE INDEX idx_historial_pedido ON historial_estado(id_pedido);
