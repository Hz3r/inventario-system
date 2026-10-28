package com.hzer.inventario_system.dto;

import com.hzer.inventario_system.entities.EstadoVenta;
import com.hzer.inventario_system.entities.Venta;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record VentaResponse(
        Long id,
        Long numero,
        LocalDateTime fecha,
        Long cajaId,
        Long clienteId,
        String clienteNombre,
        String clienteDocumento,   // DNI del cliente, si lo tiene
        String cajero,
        BigDecimal subtotal,
        BigDecimal descuento,
        BigDecimal total,
        BigDecimal opGravada,
        BigDecimal opExonerada,
        BigDecimal igv,
        BigDecimal efectivoRecibido,
        BigDecimal vuelto,
        EstadoVenta estado,
        String motivoAnulacion,
        String nota,
        List<VentaItemResponse> items,
        List<VentaPagoResponse> pagos
) {
    public static VentaResponse desde(Venta v) {
        return new VentaResponse(
                v.getId(), v.getNumero(), v.getFecha(), v.getCaja().getId(),
                v.getCliente() != null ? v.getCliente().getId() : null,
                v.getCliente() != null ? v.getCliente().getNombre() : null,
                v.getCliente() != null ? v.getCliente().getDni() : null,
                v.getUsuario() != null ? v.getUsuario().getNombre() : null,
                v.getSubtotal(), v.getDescuento(), v.getTotal(),
                v.getOpGravada(), v.getOpExonerada(), v.getIgv(),
                v.getEfectivoRecibido(), v.getVuelto(), v.getEstado(),
                v.getMotivoAnulacion(), v.getNota(),
                v.getDetalles().stream().map(VentaItemResponse::desde).toList(),
                v.getPagos().stream().map(VentaPagoResponse::desde).toList());
    }
}