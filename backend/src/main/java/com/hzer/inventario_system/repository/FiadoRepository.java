package com.hzer.inventario_system.repository;

import com.hzer.inventario_system.entities.EstadoFiado;
import com.hzer.inventario_system.entities.Fiado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Collection;
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
}