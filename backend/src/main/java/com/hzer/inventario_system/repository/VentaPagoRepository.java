package com.hzer.inventario_system.repository;

import com.hzer.inventario_system.entities.EstadoVenta;
import com.hzer.inventario_system.entities.VentaPago;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface VentaPagoRepository extends JpaRepository<VentaPago, Long> {

    // Cuánto entró por cada método en una caja: EFECTIVO 320.50, YAPE 150.00...
    @Query("""
           SELECT p.metodo AS metodo, SUM(p.monto) AS total
           FROM VentaPago p
           WHERE p.venta.caja.id = :cajaId AND p.venta.estado = :estado
           GROUP BY p.metodo
           """)
    List<TotalPorMetodo> totalesPorMetodo(@Param("cajaId") Long cajaId, @Param("estado") EstadoVenta estado);
}