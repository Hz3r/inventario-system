package com.hzer.inventario_system.service;

import com.hzer.inventario_system.dto.ClienteRequest;
import com.hzer.inventario_system.dto.ClienteResponse;
import com.hzer.inventario_system.entities.Cliente;
import com.hzer.inventario_system.entities.EstadoFiado;
import com.hzer.inventario_system.exception.RecursoNoEncontradoException;
import com.hzer.inventario_system.exception.ReglaNegocioException;
import com.hzer.inventario_system.repository.ClienteRepository;
import com.hzer.inventario_system.repository.FiadoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ClienteService {

    static final List<EstadoFiado> PENDIENTES = List.of(EstadoFiado.PENDIENTE, EstadoFiado.PARCIAL);

    private final ClienteRepository clienteRepository;
    private final FiadoRepository fiadoRepository;

    public List<ClienteResponse> listar(String buscar) {
        String texto = limpiar(buscar);
        List<Cliente> clientes = (texto == null)
                ? clienteRepository.findByActivoTrueOrderByNombreAsc()
                : clienteRepository.findByActivoTrueAndNombreContainingIgnoreCaseOrderByNombreAsc(texto);
        return clientes.stream().map(this::aResponse).toList();
    }

    public ClienteResponse obtener(Long id) {
        return aResponse(buscar(id));
    }

    @Transactional
    public ClienteResponse crear(ClienteRequest req) {
        String dni = limpiar(req.getDni());
        if (dni != null && clienteRepository.existsByDni(dni)) {
            throw new ReglaNegocioException("Ya existe un cliente con el DNI " + dni);
        }
        Cliente c = new Cliente();
        copiar(req, c);
        return aResponse(clienteRepository.save(c));
    }

    @Transactional
    public ClienteResponse actualizar(Long id, ClienteRequest req) {
        Cliente c = buscar(id);
        copiar(req, c);
        return aResponse(c);
    }

    public BigDecimal deudaActual(Long clienteId) {
        return fiadoRepository.deudaDeCliente(clienteId, PENDIENTES);
    }

    Cliente buscar(Long id) {
        return clienteRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Cliente", id));
    }

    private void copiar(ClienteRequest req, Cliente c) {
        c.setNombre(req.getNombre().trim());
        c.setDni(limpiar(req.getDni()));
        c.setTelefono(limpiar(req.getTelefono()));
        c.setDireccion(limpiar(req.getDireccion()));
        c.setLimiteCredito(req.getLimiteCredito());
        c.setNota(limpiar(req.getNota()));
    }

    private ClienteResponse aResponse(Cliente c) {
        return new ClienteResponse(c.getId(), c.getNombre(), c.getDni(), c.getTelefono(), c.getDireccion(),
                c.getLimiteCredito(), deudaActual(c.getId()), c.getNota());
    }

    private String limpiar(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}