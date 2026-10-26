package com.hzer.inventario_system.service;

import com.hzer.inventario_system.dto.*;
import com.hzer.inventario_system.entities.*;
import com.hzer.inventario_system.exception.ReglaNegocioException;
import com.hzer.inventario_system.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FiadoService {

    private final FiadoRepository fiadoRepository;
    private final AbonoRepository abonoRepository;
    private final ClienteRepository clienteRepository;
    private final CajaRepository cajaRepository;
    private final ClienteService clienteService;
    private final UsuarioActualService usuarioActual;

    // ============================ CONSULTAS ============================

    /** Quién debe y cuánto: una fila por cliente, el que más debe primero */
    public List<DeudaClienteResponse> resumen() {
        List<DeudaPorCliente> filas = fiadoRepository.resumenPorCliente(ClienteService.PENDIENTES);
        Map<Long, Cliente> clientes = clienteRepository
                .findAllById(filas.stream().map(DeudaPorCliente::getClienteId).toList())
                .stream().collect(Collectors.toMap(Cliente::getId, Function.identity()));

        return filas.stream()
                .map(f -> {
                    Cliente c = clientes.get(f.getClienteId());
                    return new DeudaClienteResponse(c.getId(), c.getNombre(), c.getTelefono(), c.getLimiteCredito(),
                            f.getTotalFiado(), f.getTotalFiado().subtract(f.getDeuda()), f.getDeuda(),
                            f.getCantidad(), f.getDesde());
                })
                .sorted(Comparator.comparing(DeudaClienteResponse::deuda).reversed())
                .toList();
    }

    /** La cuenta completa de un cliente: qué llevó, qué abonó y cuánto debe */
    public CuentaClienteResponse cuenta(Long clienteId) {
        ClienteResponse cliente = clienteService.obtener(clienteId);
        List<FiadoResponse> fiados = fiadoRepository.findByClienteIdOrderByFechaDescIdDesc(clienteId)
                .stream().map(FiadoResponse::desde).toList();
        List<AbonoResponse> abonos = abonoRepository.findByFiadoClienteIdOrderByFechaDescIdDesc(clienteId)
                .stream().map(AbonoResponse::desde).toList();
        return new CuentaClienteResponse(cliente, fiados, abonos);
    }

    // ============================ ABONAR ============================

    /**
     * El cliente paga una parte (o todo). El monto se aplica primero a la deuda más antigua:
     * si debe S/ 10 (lunes) y S/ 15 (miércoles) y abona S/ 20, paga completo el lunes
     * y deja el miércoles en S/ 5.
     */
    @Transactional
    public CuentaClienteResponse abonar(Long clienteId, AbonoRequest req) {
        if (req.getMetodo() == MetodoPago.FIADO) {
            throw new ReglaNegocioException("Un abono no se puede pagar con fiado");
        }
        Cliente cliente = clienteService.buscar(clienteId);
        BigDecimal monto = req.getMonto().setScale(2, RoundingMode.HALF_UP);

        List<Fiado> pendientes = fiadoRepository
                .findByClienteIdAndEstadoInOrderByFechaAscIdAsc(clienteId, ClienteService.PENDIENTES);
        BigDecimal deuda = pendientes.stream().map(Fiado::getSaldo).reduce(BigDecimal.ZERO, BigDecimal::add);

        if (deuda.signum() == 0) {
            throw new ReglaNegocioException(cliente.getNombre() + " no tiene deudas pendientes");
        }
        if (monto.compareTo(deuda) > 0) {
            throw new ReglaNegocioException(cliente.getNombre() + " debe S/ " + deuda + "; no puede abonar más que eso");
        }

        // El efectivo tiene que entrar a una caja abierta para que cuadre el cierre
        Caja caja = cajaRepository.findFirstByEstado(EstadoCaja.ABIERTA).orElse(null);
        if (req.getMetodo() == MetodoPago.EFECTIVO && caja == null) {
            throw new ReglaNegocioException("Abre la caja en el Punto de Venta para recibir abonos en efectivo");
        }

        Usuario usuario = usuarioActual.obtener();
        String referencia = (req.getReferencia() == null || req.getReferencia().isBlank()) ? null : req.getReferencia().trim();
        BigDecimal restante = monto;

        for (Fiado f : pendientes) {
            if (restante.signum() == 0) break;
            BigDecimal aplicar = restante.min(f.getSaldo());

            Abono abono = new Abono();
            abono.setFiado(f);
            abono.setMonto(aplicar);
            abono.setMetodo(req.getMetodo());
            abono.setReferencia(referencia);
            abono.setCaja(caja);
            abono.setUsuario(usuario);
            abonoRepository.save(abono);

            f.setSaldo(f.getSaldo().subtract(aplicar));
            f.setEstado(f.getSaldo().signum() == 0 ? EstadoFiado.PAGADO : EstadoFiado.PARCIAL);
            restante = restante.subtract(aplicar);
        }
        return cuenta(clienteId);
    }

    // ======================= DEUDAS DEL CUADERNO =======================

    /** Registra una deuda que ya existía antes del sistema (sin venta asociada) */
    @Transactional
    public CuentaClienteResponse registrarDeudaManual(Long clienteId, DeudaManualRequest req) {
        Cliente cliente = clienteService.buscar(clienteId);
        BigDecimal monto = req.getMonto().setScale(2, RoundingMode.HALF_UP);

        Fiado f = new Fiado();
        f.setCliente(cliente);
        f.setMontoTotal(monto);
        f.setSaldo(monto);
        f.setNota((req.getNota() == null || req.getNota().isBlank()) ? "Deuda anterior (cuaderno)" : req.getNota().trim());
        fiadoRepository.save(f);
        return cuenta(clienteId);
    }
}
