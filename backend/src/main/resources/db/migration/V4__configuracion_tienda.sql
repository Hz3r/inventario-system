-- =====================================================================
-- V4: Configuraciones de la bodega
-- perfil_tienda guarda UNA sola fila con los datos que salen en el ticket.
-- =====================================================================

-- Ancho del papel de la ticketera: 80 mm (la mas comun) o 58 mm
ALTER TABLE perfil_tienda ADD COLUMN ancho_ticket INTEGER NOT NULL DEFAULT 80;
ALTER TABLE perfil_tienda
    ADD CONSTRAINT ck_perfil_tienda_ancho_ticket CHECK (ancho_ticket IN (58, 80));

-- Fila inicial (solo si la tabla esta vacia)
INSERT INTO perfil_tienda (nombre, direccion, mensaje_ticket, ancho_ticket)
SELECT 'MI BODEGA', 'Tacna, Perú', '¡Gracias por su compra!', 80
WHERE NOT EXISTS (SELECT 1 FROM perfil_tienda);
