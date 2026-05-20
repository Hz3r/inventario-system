package com.hzer.inventario_system.repository;

import com.hzer.inventario_system.entities.Categoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Categoria,Long> {
        Optional<Categoria> findByNombre(String nombre);
        Optional<Categoria> findById(Long id);
}
