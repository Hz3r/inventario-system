package com.hzer.inventario_system.repository;

import com.hzer.inventario_system.entities.MovimientoInventario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface MovimientoInventarioRepository extends JpaRepository<MovimientoInventario, Long> {

    // Kardex de un producto, lo más reciente primero
    List<MovimientoInventario> findByProductoIdOrderByFechaDescIdDesc(Long productoId);

    // Kardex general entre dos fechas (ej. "esta semana")
    List<MovimientoInventario> findByFechaBetweenOrderByFechaDescIdDesc(LocalDateTime desde, LocalDateTime hasta);
}