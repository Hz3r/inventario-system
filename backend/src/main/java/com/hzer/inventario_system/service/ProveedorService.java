package com.hzer.inventario_system.service;

import com.hzer.inventario_system.dto.ProveedorRequest;
import com.hzer.inventario_system.dto.ProveedorResponse;
import com.hzer.inventario_system.entities.Proveedor;
import com.hzer.inventario_system.exception.RecursoNoEncontradoException;
import com.hzer.inventario_system.exception.ReglaNegocioException;
import com.hzer.inventario_system.repository.ProveedorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProveedorService {

    private final ProveedorRepository proveedorRepository;

    public List<ProveedorResponse> listar() {
        return proveedorRepository.findByActivoTrueOrderByNombreAsc().stream().map(ProveedorResponse::desde).toList();
    }

    @Transactional
    public ProveedorResponse crear(ProveedorRequest req) {
        String ruc = limpiar(req.getRuc());
        if (ruc != null && proveedorRepository.existsByRuc(ruc)) {
            throw new ReglaNegocioException("Ya existe un proveedor con el RUC " + ruc);
        }
        Proveedor p = new Proveedor();
        copiar(req, p);
        return ProveedorResponse.desde(proveedorRepository.save(p));
    }

    @Transactional
    public ProveedorResponse actualizar(Long id, ProveedorRequest req) {
        Proveedor p = buscar(id);
        String ruc = limpiar(req.getRuc());
        if (ruc != null && proveedorRepository.existsByRucAndIdNot(ruc, id)) {
            throw new ReglaNegocioException("Ya existe un proveedor con el RUC " + ruc);
        }
        copiar(req, p);
        return ProveedorResponse.desde(p);
    }

    /** No se borra: sus compras antiguas lo siguen referenciando */
    @Transactional
    public void desactivar(Long id) {
        buscar(id).setActivo(false);
    }

    Proveedor buscar(Long id) {
        return proveedorRepository.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Proveedor", id));
    }

    private void copiar(ProveedorRequest req, Proveedor p) {
        p.setNombre(req.getNombre().trim());
        p.setRuc(limpiar(req.getRuc()));
        p.setContacto(limpiar(req.getContacto()));
        p.setTelefono(limpiar(req.getTelefono()));
        p.setEmail(limpiar(req.getEmail()));
        p.setDireccion(limpiar(req.getDireccion()));
    }

    private String limpiar(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
