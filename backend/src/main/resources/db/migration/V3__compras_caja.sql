-- =====================================================================
-- V3: las compras pagadas con plata del cajón quedan ligadas a la caja,
--     para que el cierre de caja descuente ese efectivo.
-- NO editar este archivo una vez ejecutado. Los cambios van en V4, V5...
-- =====================================================================

ALTER TABLE compras ADD COLUMN caja_id BIGINT;

ALTER TABLE compras
    ADD CONSTRAINT fk_compras_caja FOREIGN KEY (caja_id) REFERENCES cajas (id);

CREATE INDEX ix_compras_caja ON compras (caja_id);
