package com.hzer.inventario_system.repository;

import com.hzer.inventario_system.entities.EstadoVenta;
import com.hzer.inventario_system.entities.Venta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface VentaRepository extends JpaRepository<Venta, Long> {

    // Siguiente número de ticket, directo de la secuencia de PostgreSQL
    @Query(value = "SELECT nextval('ventas_numero_seq')", nativeQuery = true)
    Long siguienteNumero();

    Optional<Venta> findByNumero(Long numero);

    List<Venta> findByFechaBetweenOrderByFechaDesc(LocalDateTime desde, LocalDateTime hasta);

    List<Venta> findByCajaIdOrderByFechaDesc(Long cajaId);

    // Ventas de un periodo en un estado (para calcular la ganancia)
    List<Venta> findByFechaBetweenAndEstado(LocalDateTime desde, LocalDateTime hasta, EstadoVenta estado);

    long countByCajaIdAndEstado(Long cajaId, EstadoVenta estado);
}