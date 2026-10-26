package com.hzer.inventario_system.controller;

import com.hzer.inventario_system.dto.ImportacionResponse;
import com.hzer.inventario_system.exception.ReglaNegocioException;
import com.hzer.inventario_system.service.ImportacionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.ZoneId;

/**
 * Importar productos, clientes y proveedores desde Excel.
 *   GET  /api/importar/productos/plantilla       -> plantilla vacía con un ejemplo
 *   GET  /api/importar/productos/exportar        -> los datos actuales, para editarlos y volver a subirlos
 *   POST /api/importar/productos                 -> vista previa (no guarda nada)
 *   POST /api/importar/productos?confirmar=true  -> guarda las filas correctas
 */
@RestController
@RequestMapping("/api/importar")
@RequiredArgsConstructor
public class ImportacionController {

    private static final MediaType XLSX =
            MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private final ImportacionService importacionService;

    @GetMapping("/{tipo}/plantilla")
    public ResponseEntity<byte[]> plantilla(@PathVariable String tipo) {
        ImportacionService.Tipo t = ImportacionService.tipo(tipo);
        return excel("plantilla-" + t.name().toLowerCase() + ".xlsx", importacionService.plantilla(t));
    }

    @GetMapping("/{tipo}/exportar")
    public ResponseEntity<byte[]> exportar(@PathVariable String tipo) {
        ImportacionService.Tipo t = ImportacionService.tipo(tipo);
        String fecha = LocalDate.now(ZoneId.of("America/Lima")).toString();
        return excel(t.name().toLowerCase() + "-" + fecha + ".xlsx", importacionService.exportar(t));
    }

    @PostMapping(value = "/{tipo}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ImportacionResponse importar(@PathVariable String tipo,
                                        @RequestParam("archivo") MultipartFile archivo,
                                        @RequestParam(defaultValue = "false") boolean confirmar) {
        ImportacionService.Tipo t = ImportacionService.tipo(tipo);
        if (archivo.isEmpty()) throw new ReglaNegocioException("El archivo está vacío");
        try (InputStream in = archivo.getInputStream()) {
            return importacionService.importar(t, in, confirmar);
        } catch (IOException e) {
            throw new ReglaNegocioException("No se pudo leer el archivo subido");
        }
    }

    private ResponseEntity<byte[]> excel(String nombre, byte[] contenido) {
        return ResponseEntity.ok()
                .contentType(XLSX)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(nombre).build().toString())
                .body(contenido);
    }
}
