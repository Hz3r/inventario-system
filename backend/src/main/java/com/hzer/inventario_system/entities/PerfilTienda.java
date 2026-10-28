package com.hzer.inventario_system.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Datos de la bodega (una sola fila). Salen en el ticket y en los mensajes de WhatsApp.
 */
@Entity
@Table(name = "perfil_tienda")
@Getter
@Setter
public class PerfilTienda {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nombre;

    /** Nombre legal de la empresa o persona (el que figura en el RUC). nombre = nombre comercial */
    @Column(name = "razon_social", length = 150)
    private String razonSocial;

    private String ruc;

    /** true = el ticket muestra base + IGV. false = Nuevo RUS (la boleta no discrimina impuestos) */
    @Column(name = "desglosa_igv", nullable = false)
    private Boolean desglosaIgv = true;
    private String direccion;

    @Column(length = 20)
    private String telefono;

    @Column(name = "mensaje_ticket")
    private String mensajeTicket;

    /** 80 o 58 (milimetros del papel de la ticketera) */
    @Column(name = "ancho_ticket", nullable = false)
    private Integer anchoTicket = 80;

    // ---- Etiquetas de la balanza (ver util/EtiquetaBalanza) ----

    /** ¿Se reconocen los códigos de barras que imprime la balanza? */
    @Column(name = "balanza_etiquetas", nullable = false)
    private Boolean balanzaEtiquetas = false;

    /** Con qué empiezan esas etiquetas (casi siempre "20" o "2") */
    @Column(name = "balanza_prefijo", nullable = false, length = 2)
    private String balanzaPrefijo = "20";

    /** Cuántos dígitos ocupa el PLU dentro de la etiqueta (4 a 6) */
    @Column(name = "balanza_digitos_plu", nullable = false)
    private Integer balanzaDigitosPlu = 5;

    @Enumerated(EnumType.STRING)
    @Column(name = "balanza_tipo_valor", nullable = false, length = 10)
    private TipoValorEtiqueta balanzaTipoValor = TipoValorEtiqueta.PESO;

    /** Imagen PNG/JPG chica (BYTEA). El frontend la reduce a 256 px antes de subirla */
    private byte[] logo;
}
