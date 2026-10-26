package com.hzer.inventario_system.repository;

import com.hzer.inventario_system.entities.Caja;
import com.hzer.inventario_system.entities.EstadoCaja;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CajaRepository extends JpaRepository<Caja, Long> {

    // Solo puede haber una abierta (la V2 lo garantiza con un índice único)
    Optional<Caja> findFirstByEstado(EstadoCaja estado);

    // Historial de cierres
    List<Caja> findTop30ByOrderByAbiertaEnDesc();
}