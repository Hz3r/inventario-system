package com.hzer.inventario_system.service;

import com.hzer.inventario_system.dto.MovimientoResponse;
import com.hzer.inventario_system.entities.MotivoMovimiento;
import com.hzer.inventario_system.entities.MovimientoInventario;
import com.hzer.inventario_system.entities.Producto;
import com.hzer.inventario_system.entities.UnidadMedida;
import com.hzer.inventario_system.exception.RecursoNoEncontradoException;
import com.hzer.inventario_system.exception.ReglaNegocioException;
import com.hzer.inventario_system.repository.MovimientoInventarioRepository;
import com.hzer.inventario_system.repository.ProductoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * ÚNICO punto del sistema que cambia el stock.
 * Cada cambio deja una fila en el kardex con el antes y el después.
 */
@Service
@RequiredArgsConstructor
public class KardexService {

    private final ProductoRepository productoRepository;
    private final MovimientoInventarioRepository movimientoRepository;

    /**
     * @param cantidad con signo: +12 entra, -3 sale (en unidad base)
     */
    @Transactional
    public MovimientoInventario registrar(Long productoId, MotivoMovimiento motivo, BigDecimal cantidad,
                                          BigDecimal costoUnitario, Long ventaId, Long compraId, String nota) {
        if (cantidad == null || cantidad.signum() == 0) {
            throw new ReglaNegocioException("La cantidad del movimiento no puede ser 0");
        }

        // Bloquea la fila del producto hasta que termine la transacción
        Producto producto = productoRepository.findByIdParaActualizar(productoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto", productoId));

        if (producto.getUnidadMedida() == UnidadMedida.UND && !esEntero(cantidad)) {
            throw new ReglaNegocioException(producto.getNombre()
                    + " se vende por unidades: la cantidad debe ser un número entero");
        }

        BigDecimal anterior = producto.getStockActual();
        BigDecimal resultante = anterior.add(cantidad);

        // Una venta puede dejar el stock en negativo (en la bodega a veces se vende antes de
        // registrar la compra). Un ajuste o una merma no: no puedes botar lo que no tienes.
        if (resultante.signum() < 0 && motivo != MotivoMovimiento.VENTA) {
            throw new ReglaNegocioException("No hay stock suficiente de " + producto.getNombre()
                    + " (hay " + anterior.stripTrailingZeros().toPlainString() + ")");
        }

        producto.setStockActual(resultante);

        MovimientoInventario mov = new MovimientoInventario();
        mov.setProducto(producto);
        mov.setMotivo(motivo);
        mov.setCantidad(cantidad);
        mov.setStockAnterior(anterior);
        mov.setStockResultante(resultante);
        mov.setCostoUnitario(costoUnitario);
        mov.setVentaId(ventaId);
        mov.setCompraId(compraId);
        mov.setNota(nota);
        return movimientoRepository.save(mov);
    }

    @Transactional(readOnly = true)
    public List<MovimientoResponse> deProducto(Long productoId) {
        if (!productoRepository.existsById(productoId)) {
            throw new RecursoNoEncontradoException("Producto", productoId);
        }
        return movimientoRepository.findByProductoIdOrderByFechaDescIdDesc(productoId)
                .stream().map(MovimientoResponse::desde).toList();
    }

    /** Kardex general de un rango de días, incluyendo ambos días completos */
    @Transactional(readOnly = true)
    public List<MovimientoResponse> entreFechas(LocalDate desde, LocalDate hasta) {
        if (hasta.isBefore(desde)) {
            throw new ReglaNegocioException("La fecha 'hasta' no puede ser anterior a 'desde'");
        }
        return movimientoRepository.findByFechaBetweenOrderByFechaDescIdDesc(
                        desde.atStartOfDay(), hasta.plusDays(1).atStartOfDay().minusNanos(1))
                .stream().map(MovimientoResponse::desde).toList();
    }

    private boolean esEntero(BigDecimal n) {
        return n.stripTrailingZeros().scale() <= 0;
    }
}