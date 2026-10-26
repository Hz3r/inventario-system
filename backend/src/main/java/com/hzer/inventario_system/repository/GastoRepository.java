package com.hzer.inventario_system.repository;

import com.hzer.inventario_system.entities.Gasto;
import com.hzer.inventario_system.entities.MetodoPago;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface GastoRepository extends JpaRepository<Gasto, Long> {

    List<Gasto> findByFechaBetweenOrderByFechaDescIdDesc(LocalDateTime desde, LocalDateTime hasta);

    // Gastos pagados con plata de una caja (para el cierre)
    @Query("""
           SELECT COALESCE(SUM(g.monto), 0)
           FROM Gasto g
           WHERE g.caja.id = :cajaId AND g.metodoPago = :metodo
           """)
    BigDecimal sumaPorCajaYMetodo(@Param("cajaId") Long cajaId, @Param("metodo") MetodoPago metodo);
}
