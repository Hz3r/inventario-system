package com.hzer.inventario_system.repository;

import com.hzer.inventario_system.entities.Categoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Categoria, Long> {

        Optional<Categoria> findByNombre(String nombre);

        List<Categoria> findAllByOrderByNombreAsc();

        // "Bebidas" y "bebidas" cuentan como la misma
        boolean existsByNombreIgnoreCase(String nombre);

        boolean existsByNombreIgnoreCaseAndIdNot(String nombre, Long id);
}