-- =====================================================================
-- V6: Balanza electronica
--  - productos.plu: el codigo del producto en la balanza (PLU). Las balanzas
--    que imprimen etiquetas lo ponen dentro del codigo de barras.
--  - perfil_tienda: como leer esas etiquetas (EAN-13 que empiezan con 2).
-- NO editar este archivo una vez ejecutado. Los cambios van en V7, V8...
-- =====================================================================

ALTER TABLE productos ADD COLUMN plu VARCHAR(6);
ALTER TABLE productos ADD CONSTRAINT uk_productos_plu UNIQUE (plu);

-- Etiqueta = prefijo + PLU + valor (peso en gramos o importe en centimos) + digito de control
ALTER TABLE perfil_tienda ADD COLUMN balanza_etiquetas  BOOLEAN     NOT NULL DEFAULT FALSE;
ALTER TABLE perfil_tienda ADD COLUMN balanza_prefijo    VARCHAR(2)  NOT NULL DEFAULT '20';
ALTER TABLE perfil_tienda ADD COLUMN balanza_digitos_plu INTEGER    NOT NULL DEFAULT 5;
ALTER TABLE perfil_tienda ADD COLUMN balanza_tipo_valor VARCHAR(10) NOT NULL DEFAULT 'PESO';

ALTER TABLE perfil_tienda
    ADD CONSTRAINT ck_perfil_tienda_balanza_digitos CHECK (balanza_digitos_plu BETWEEN 4 AND 6);
ALTER TABLE perfil_tienda
    ADD CONSTRAINT ck_perfil_tienda_balanza_tipo CHECK (balanza_tipo_valor IN ('PESO', 'PRECIO'));
