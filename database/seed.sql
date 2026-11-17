-- SalatiaCoffee - Datos de EJEMPLO para pruebas (no son datos reales de una cafetería).
-- Reemplázalos por el menú real o simulado con fidelidad antes de las pruebas finales.

INSERT INTO mesa (numero, codigo_qr) VALUES (1, NULL), (2, NULL), (3, NULL), (4, NULL), (5, NULL);

INSERT INTO categoria (nombre, orden) VALUES
  ('Bebidas calientes', 1),
  ('Bebidas frías', 2),
  ('Panadería', 3);

INSERT INTO producto (nombre, descripcion, precio, id_categoria) VALUES
  ('Tinto', 'Café filtrado', 3000, 1),
  ('Cappuccino', 'Espresso con leche espumada', 7000, 1),
  ('Chocolate caliente', 'Chocolate con leche', 6000, 1),
  ('Limonada natural', 'Limón y azúcar', 5500, 2),
  ('Café frío', 'Café con hielo y leche', 8000, 2),
  ('Croissant', 'Croissant de mantequilla', 6500, 3),
  ('Pan de queso', 'Pan de queso horneado', 3500, 3);

-- Los usuarios del personal NO se crean aquí: la contraseña debe guardarse con hash.
-- Se creará un script en el Sprint 2 (autenticación, RF-10).
