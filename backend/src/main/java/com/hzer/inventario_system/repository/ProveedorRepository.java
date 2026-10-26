package com.hzer.inventario_system.repository;

import com.hzer.inventario_system.entities.Proveedor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProveedorRepository extends JpaRepository<Proveedor, Long> {

    // Solo los activos, ordenados A-Z
    List<Proveedor> findByActivoTrueOrderByNombreAsc();

    // Para no registrar dos veces el mismo RUC
    boolean existsByRuc(String ruc);
}