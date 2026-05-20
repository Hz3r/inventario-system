package com.hzer.inventario_system.repository;

import com.hzer.inventario_system.entities.Producto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProductoRepository extends JpaRepository<Producto, Long> {

        Optional<Producto> findByNombre(String nombre);

        Optional<Producto> findByCodigoBarras(String codigoBarras);

}