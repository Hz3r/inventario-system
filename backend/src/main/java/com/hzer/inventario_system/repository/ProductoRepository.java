package com.hzer.inventario_system.repository;

import com.hzer.inventario_system.entities.Producto;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductoRepository extends JpaRepository<Producto, Long> {

        Optional<Producto> findByNombre(String nombre);

        // Cuando la pistola escanea el código de una botella / unidad
        Optional<Producto> findByCodigoBarrasAndActivoTrue(String codigoBarras);

        boolean existsByCodigoBarras(String codigoBarras);

        boolean existsByCodigoBarrasAndIdNot(String codigoBarras, Long id);

        // Lista del inventario, A-Z
        List<Producto> findByActivoTrueOrderByNombreAsc();

        // Buscador: "pils" encuentra "Pilsen 630ml"
        List<Producto> findByActivoTrueAndNombreContainingIgnoreCaseOrderByNombreAsc(String texto);

        // Productos con stock bajo (para el dashboard y las alertas)
        @Query("""
           SELECT p FROM Producto p
           WHERE p.activo = true
             AND p.stockMinimo IS NOT NULL
             AND p.stockActual <= p.stockMinimo
           ORDER BY p.stockActual ASC
           """)
        List<Producto> findStockBajo();

        // Bloquea la fila mientras se cambia el stock (ver explicación)
        @Lock(LockModeType.PESSIMISTIC_WRITE)
        @Query("SELECT p FROM Producto p WHERE p.id = :id")
        Optional<Producto> findByIdParaActualizar(@Param("id") Long id);
}