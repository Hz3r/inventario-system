-- =====================================================================
-- V7: IGV automatico en ventas + datos para la nota de venta
-- Los precios de venta INCLUYEN IGV (lo normal en una bodega).
-- El sistema separa solo la base y el IGV: nadie lo calcula a mano.
-- =====================================================================

-- Datos del emisor para la nota de venta
ALTER TABLE perfil_tienda
    ADD COLUMN razon_social VARCHAR(150),
    ADD COLUMN desglosa_igv BOOLEAN NOT NULL DEFAULT TRUE;   -- FALSE si la bodega esta en el Nuevo RUS

-- Cada linea recuerda si el producto estaba afecto al IGV AL MOMENTO de venderse
ALTER TABLE venta_detalle ADD COLUMN afecto_igv BOOLEAN NOT NULL DEFAULT TRUE;

-- Resumen tributario de cada venta (lo que pide SUNAT en boletas y facturas)
ALTER TABLE ventas
    ADD COLUMN op_gravada   NUMERIC(10,2) NOT NULL DEFAULT 0,   -- base sin IGV de lo afecto
    ADD COLUMN op_exonerada NUMERIC(10,2) NOT NULL DEFAULT 0,   -- lo exonerado/inafecto
    ADD COLUMN igv          NUMERIC(10,2) NOT NULL DEFAULT 0;

UPDATE productos SET igv = TRUE WHERE igv IS NULL;

-- Ventas que ya existian: se calculan con el IGV actual de cada producto
UPDATE venta_detalle d SET afecto_igv = COALESCE(p.igv, TRUE)
FROM productos p WHERE p.id = d.producto_id;

WITH t AS (
    SELECT v.id, v.total, v.subtotal,
           COALESCE(SUM(d.subtotal) FILTER (WHERE d.afecto_igv), 0) AS gravado
    FROM ventas v
    JOIN venta_detalle d ON d.venta_id = v.id
    GROUP BY v.id, v.total, v.subtotal
), n AS (
    -- el descuento general se reparte en proporcion
    SELECT id, total,
           CASE WHEN subtotal > 0 THEN ROUND(gravado * total / subtotal, 2) ELSE 0 END AS gravado_neto
    FROM t
)
UPDATE ventas v SET
    op_gravada   = ROUND(n.gravado_neto / 1.18, 2),
    igv          = n.gravado_neto - ROUND(n.gravado_neto / 1.18, 2),
    op_exonerada = n.total - n.gravado_neto
FROM n WHERE n.id = v.id;
