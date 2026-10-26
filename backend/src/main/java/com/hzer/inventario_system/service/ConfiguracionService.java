package com.hzer.inventario_system.service;

import com.hzer.inventario_system.dto.PerfilTiendaRequest;
import com.hzer.inventario_system.dto.PerfilTiendaResponse;
import com.hzer.inventario_system.entities.PerfilTienda;
import com.hzer.inventario_system.exception.ReglaNegocioException;
import com.hzer.inventario_system.repository.PerfilTiendaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Base64;

@Service
@RequiredArgsConstructor
public class ConfiguracionService {

    private static final int MAX_LOGO_BYTES = 300 * 1024;   // 300 KB
    private static final String NOMBRE_POR_DEFECTO = "MI BODEGA";

    private final PerfilTiendaRepository perfilRepository;

    @Transactional(readOnly = true)
    public PerfilTiendaResponse obtener() {
        return aResponse(perfilRepository.findFirstByOrderByIdAsc().orElseGet(PerfilTienda::new));
    }

    @Transactional
    public PerfilTiendaResponse actualizar(PerfilTiendaRequest req) {
        Integer ancho = req.getAnchoTicket();
        if (ancho != 58 && ancho != 80) {
            throw new ReglaNegocioException("El ancho del ticket debe ser 58 u 80 mm");
        }

        PerfilTienda perfil = perfilRepository.findFirstByOrderByIdAsc().orElseGet(PerfilTienda::new);
        perfil.setNombre(req.getNombre().trim());
        perfil.setRuc(limpiar(req.getRuc()));
        perfil.setDireccion(limpiar(req.getDireccion()));
        perfil.setTelefono(limpiar(req.getTelefono()));
        perfil.setMensajeTicket(limpiar(req.getMensajeTicket()));
        perfil.setAnchoTicket(ancho);
        perfil.setLogo(decodificarLogo(req.getLogo()));

        return aResponse(perfilRepository.save(perfil));
    }

    // ---------------------------------------------------------------------

    /** "  " → null, para no guardar textos vacíos */
    private static String limpiar(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    /** "data:image/png;base64,iVBOR..." → bytes. Solo PNG o JPG, máximo 300 KB */
    private static byte[] decodificarLogo(String dataUrl) {
        if (dataUrl == null || dataUrl.isBlank()) return null;

        int coma = dataUrl.indexOf(";base64,");
        if (!dataUrl.startsWith("data:image/") || coma < 0) {
            throw new ReglaNegocioException("El logo no es una imagen válida");
        }
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(dataUrl.substring(coma + 8));
        } catch (IllegalArgumentException e) {
            throw new ReglaNegocioException("El logo no es una imagen válida");
        }
        if (bytes.length > MAX_LOGO_BYTES) {
            throw new ReglaNegocioException("El logo pesa demasiado (máximo 300 KB)");
        }
        if (!esPng(bytes) && !esJpg(bytes)) {
            throw new ReglaNegocioException("El logo debe ser PNG o JPG");
        }
        return bytes;
    }

    private static String codificarLogo(byte[] bytes) {
        if (bytes == null || bytes.length == 0) return null;
        String tipo = esPng(bytes) ? "image/png" : "image/jpeg";
        return "data:" + tipo + ";base64," + Base64.getEncoder().encodeToString(bytes);
    }

    // Los primeros bytes de un archivo ("firma") dicen qué tipo de imagen es
    private static boolean esPng(byte[] b) {
        return b.length > 4 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G';
    }

    private static boolean esJpg(byte[] b) {
        return b.length > 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8;
    }

    private static PerfilTiendaResponse aResponse(PerfilTienda p) {
        return new PerfilTiendaResponse(
                p.getNombre() != null ? p.getNombre() : NOMBRE_POR_DEFECTO,
                p.getRuc(),
                p.getDireccion(),
                p.getTelefono(),
                p.getMensajeTicket(),
                p.getAnchoTicket() != null ? p.getAnchoTicket() : 80,
                codificarLogo(p.getLogo())
        );
    }
}
