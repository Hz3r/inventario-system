package com.hzer.inventario_system.repository;

import com.hzer.inventario_system.entities.Compra;
import com.hzer.inventario_system.entities.EstadoCompra;
import com.hzer.inventario_system.entities.MetodoPagoCompra;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface CompraRepository extends JpaRepository<Compra, Long> {

    List<Compra> findTop100ByOrderByFechaPedidoDescIdDesc();

    // Pedidos que todavía no llegan, del más antiguo al más nuevo (para las notificaciones)
    List<Compra> findByEstadoAndFechaPedidoBeforeOrderByFechaPedidoAsc(EstadoCompra estado, LocalDateTime antes);

    long countByEstado(EstadoCompra estado);

    @Query("SELECT COALESCE(SUM(c.total), 0) FROM Compra c WHERE c.estado = :estado")
    BigDecimal sumaPorEstado(@Param("estado") EstadoCompra estado);

    // Compras recibidas y pagadas con efectivo del cajón (para el cierre de caja)
    @Query("""
           SELECT COALESCE(SUM(c.total), 0)
           FROM Compra c
           WHERE c.caja.id = :cajaId AND c.metodoPago = :metodo AND c.estado = :estado
           """)
    BigDecimal sumaPorCaja(@Param("cajaId") Long cajaId,
                           @Param("metodo") MetodoPagoCompra metodo,
                           @Param("estado") EstadoCompra estado);
}
