package com.hzer.inventario_system.repository;

import com.hzer.inventario_system.entities.NotificacionLeida;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface NotificacionLeidaRepository extends JpaRepository<NotificacionLeida, Long> {

    @Query("SELECT n.clave FROM NotificacionLeida n WHERE n.usuario.id = :usuarioId")
    List<String> clavesLeidas(@Param("usuarioId") Long usuarioId);

    @Query("SELECT n.clave FROM NotificacionLeida n WHERE n.usuario.id = :usuarioId AND n.clave IN :claves")
    List<String> clavesLeidasEntre(@Param("usuarioId") Long usuarioId, @Param("claves") Collection<String> claves);

    // Las marcas viejas ya no sirven: la alerta se resolvió o cambió de clave
    @Modifying
    @Query("DELETE FROM NotificacionLeida n WHERE n.leidaEn < :antes")
    int borrarAnterioresA(@Param("antes") LocalDateTime antes);
}
