package com.hzer.inventario_system.repository;

import com.hzer.inventario_system.entities.Producto;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Modifying;

import java.time.LocalDate;
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

        // Para las notificaciones: agotados (aunque no tengan mínimo) y los que llegaron al mínimo
        @Query("""
           SELECT p FROM Producto p
           WHERE p.activo = true
             AND (p.stockActual <= 0
                  OR (p.stockMinimo IS NOT NULL AND p.stockActual <= p.stockMinimo))
           ORDER BY p.stockActual ASC, p.nombre ASC
           """)
        List<Producto> findConAlertaDeStock();

        // Vencidos o que vencen hasta la fecha indicada (los más próximos primero)
        List<Producto> findByActivoTrueAndVencimientoLessThanEqualOrderByVencimientoAsc(LocalDate hasta);

        // Para la importación desde Excel
        Optional<Producto> findByCodigoBarras(String codigoBarras);

        Optional<Producto> findFirstByActivoTrueAndNombreIgnoreCase(String nombre);

        // Bloquea la fila mientras se cambia el stock (ver explicación)
        @Lock(LockModeType.PESSIMISTIC_WRITE)
        @Query("SELECT p FROM Producto p WHERE p.id = :id")
        Optional<Producto> findByIdParaActualizar(@Param("id") Long id);

        // Cuántos productos activos tiene cada categoría (una sola consulta para todas)
        @Query("""
           SELECT p.categoria.id AS categoriaId, COUNT(p) AS total
           FROM Producto p
           WHERE p.activo = true AND p.categoria IS NOT NULL
           GROUP BY p.categoria.id
           """)
        List<ConteoPorCategoria> contarPorCategoria();

        long countByCategoriaIdAndActivoTrue(Long categoriaId);

        // Los productos eliminados (inactivos) se quedan sin categoría para poder borrarla
        @Modifying
        @Query("UPDATE Producto p SET p.categoria = null WHERE p.categoria.id = :categoriaId AND p.activo = false")
        int quitarCategoriaAInactivos(@Param("categoriaId") Long categoriaId);

}
