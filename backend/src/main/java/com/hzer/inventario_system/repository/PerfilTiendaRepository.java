package com.hzer.inventario_system.repository;

import com.hzer.inventario_system.entities.PerfilTienda;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PerfilTiendaRepository extends JpaRepository<PerfilTienda, Long> {

    /** La tabla tiene una sola fila: la de menor id */
    Optional<PerfilTienda> findFirstByOrderByIdAsc();
}
