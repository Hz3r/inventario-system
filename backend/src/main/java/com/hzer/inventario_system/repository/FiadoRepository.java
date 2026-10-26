package com.hzer.inventario_system.repository;

import com.hzer.inventario_system.entities.EstadoFiado;
import com.hzer.inventario_system.entities.Fiado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface FiadoRepository extends JpaRepository<Fiado, Long> {

    Optional<Fiado> findByVentaId(Long ventaId);

    // Cuánto debe un cliente en total (para el límite de crédito)
    @Query("""
           SELECT COALESCE(SUM(f.saldo), 0)
           FROM Fiado f
           WHERE f.cliente.id = :clienteId AND f.estado IN :estados
           """)
    BigDecimal deudaDeCliente(@Param("clienteId") Long clienteId,
                              @Param("estados") Collection<EstadoFiado> estados);

    // Fiados pendientes de un cliente, del más antiguo al más nuevo (los abonos se aplican en ese orden)
    List<Fiado> findByClienteIdAndEstadoInOrderByFechaAscIdAsc(Long clienteId, Collection<EstadoFiado> estados);

    // Historial completo del cliente, lo más reciente primero
    List<Fiado> findByClienteIdOrderByFechaDescIdDesc(Long clienteId);

    // Quién debe y cuánto (una fila por cliente)
    @Query("""
           SELECT f.cliente.id AS clienteId, SUM(f.saldo) AS deuda, SUM(f.montoTotal) AS totalFiado,
                  COUNT(f) AS cantidad, MIN(f.fecha) AS desde
           FROM Fiado f
           WHERE f.estado IN :estados
           GROUP BY f.cliente.id
           """)
    List<DeudaPorCliente> resumenPorCliente(@Param("estados") Collection<EstadoFiado> estados);
}
