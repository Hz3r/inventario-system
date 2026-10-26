package com.hzer.inventario_system.service;

import com.hzer.inventario_system.dto.GastoRequest;
import com.hzer.inventario_system.dto.GastoResponse;
import com.hzer.inventario_system.entities.*;
import com.hzer.inventario_system.exception.RecursoNoEncontradoException;
import com.hzer.inventario_system.exception.ReglaNegocioException;
import com.hzer.inventario_system.repository.CajaRepository;
import com.hzer.inventario_system.repository.GastoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GastoService {

    private static final ZoneId LIMA = ZoneId.of("America/Lima");

    private final GastoRepository gastoRepository;
    private final CajaRepository cajaRepository;
    private final UsuarioActualService usuarioActual;
    private final CajaService cajaService;

    public List<GastoResponse> listar(LocalDate desde, LocalDate hasta) {
        return gastoRepository.findByFechaBetweenOrderByFechaDescIdDesc(
                        desde.atStartOfDay(), hasta.plusDays(1).atStartOfDay().minusNanos(1))
                .stream().map(GastoResponse::desde).toList();
    }

    @Transactional
    public GastoResponse crear(GastoRequest req) {
        if (req.getMetodoPago() == MetodoPago.FIADO) {
            throw new ReglaNegocioException("Un gasto no se puede pagar con fiado");
        }
        boolean esHoy = req.getFecha() == null || req.getFecha().equals(LocalDate.now(LIMA));

        Gasto g = new Gasto();
        g.setCategoria(req.getCategoria());
        g.setDescripcion(req.getDescripcion() == null || req.getDescripcion().isBlank() ? null : req.getDescripcion().trim());
        g.setMonto(req.getMonto().setScale(2, RoundingMode.HALF_UP));
        g.setMetodoPago(req.getMetodoPago());
        if (!esHoy) g.setFecha(req.getFecha().atTime(12, 0));   // gasto de otro día: a mediodía de ese día
        g.setUsuario(usuarioActual.obtener());

        // Efectivo de hoy que sale del cajón: queda ligado a la caja para que el cierre cuadre
        if (req.getMetodoPago() == MetodoPago.EFECTIVO && req.isDeCaja() && esHoy) {
            Caja caja = cajaRepository.findFirstByEstado(EstadoCaja.ABIERTA)
                    .orElseThrow(() -> new ReglaNegocioException(
                            "No hay caja abierta. Ábrela, o desmarca \"Salió del cajón\" si lo pagaste con otra plata."));
            cajaService.validarSalidaDeEfectivo(caja, g.getMonto(), "el gasto");
            g.setCaja(caja);
        }
        return GastoResponse.desde(gastoRepository.save(g));
    }

    @Transactional
    public void eliminar(Long id) {
        Gasto g = gastoRepository.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Gasto", id));
        if (g.getCaja() != null && g.getCaja().getEstado() == EstadoCaja.CERRADA) {
            throw new ReglaNegocioException("Ese gasto salió de una caja que ya se cerró; no se puede borrar");
        }
        gastoRepository.delete(g);
    }
}
