package com.hzer.inventario_system.repository;

import com.hzer.inventario_system.entities.Abono;
import com.hzer.inventario_system.entities.MetodoPago;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface AbonoRepository extends JpaRepository<Abono, Long> {

    // Todos los abonos de un cliente, lo más reciente primero
    List<Abono> findByFiadoClienteIdOrderByFechaDescIdDesc(Long clienteId);

    // Cuánto se cobró en una caja con cierto método (para el cierre: efectivo en el cajón)
    @Query("""
           SELECT COALESCE(SUM(a.monto), 0)
           FROM Abono a
           WHERE a.caja.id = :cajaId AND a.metodo = :metodo
           """)
    BigDecimal sumaPorCajaYMetodo(@Param("cajaId") Long cajaId, @Param("metodo") MetodoPago metodo);
}
