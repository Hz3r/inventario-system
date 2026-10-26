package com.hzer.inventario_system.repository;

import com.hzer.inventario_system.entities.Cliente;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ClienteRepository extends JpaRepository<Cliente, Long> {

    List<Cliente> findByActivoTrueOrderByNombreAsc();

    // Buscador del POS: "ros" encuentra "Sra. Rosa"
    List<Cliente> findByActivoTrueAndNombreContainingIgnoreCaseOrderByNombreAsc(String texto);

    boolean existsByDni(String dni);

    // Para la importación desde Excel
    Optional<Cliente> findByDni(String dni);

    Optional<Cliente> findFirstByActivoTrueAndNombreIgnoreCase(String nombre);
}