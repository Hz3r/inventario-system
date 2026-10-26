package com.hzer.inventario_system.repository;

import com.hzer.inventario_system.entities.ProductoPresentacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.Collection;

public interface ProductoPresentacionRepository extends JpaRepository<ProductoPresentacion, Long> {

    // Presentaciones de un producto (ej. todas las de la Pilsen)
    List<ProductoPresentacion> findByProductoIdAndActivoTrueOrderByFactorAsc(Long productoId);

    // Presentaciones de MUCHOS productos en una sola consulta (para la lista del inventario)
    List<ProductoPresentacion> findByProductoIdInAndActivoTrueOrderByFactorAsc(Collection<Long> productoIds);

    // Cuando la pistola escanea el código de una caja
    Optional<ProductoPresentacion> findByCodigoBarrasAndActivoTrue(String codigoBarras);

    boolean existsByCodigoBarras(String codigoBarras);

    boolean existsByCodigoBarrasAndIdNot(String codigoBarras, Long id);

    // Para reactivar una presentación desactivada en vez de chocar con la BD
    Optional<ProductoPresentacion> findByProductoIdAndNombre(Long productoId, String nombre);
}