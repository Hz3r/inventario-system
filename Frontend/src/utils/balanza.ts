// src/utils/balanza.ts
// Balanza electrónica conectada por cable (USB o RS-232 con adaptador) a ESTA computadora.
//
// Usa la Web Serial API: solo Chrome o Edge de escritorio, y la página debe abrirse en
// http://localhost (la mini PC) o https (Railway). Desde el celular no está disponible.
//
// Casi todas las balanzas mandan el peso como texto, por ejemplo:
//     "ST,GS,+  0.750kg"     "   0.750 kg"     "N 0001.250"     "US,GS,+  0.7"
// Algunas lo mandan solas todo el tiempo (modo continuo) y otras solo cuando se les
// pide con un comando ("W", "P", ENQ...). Ambas formas se configuran aquí.
//
// La conexión es UNA sola para toda la página (este módulo), así el Punto de Venta y
// Configuraciones comparten la misma balanza sin abrir el puerto dos veces.

export type ComandoBalanza = 'NINGUNO' | 'W' | 'P' | 'S' | 'ENQ' | 'PERSONALIZADO';
export type UnidadBalanza = 'AUTO' | 'KG' | 'G' | 'LB';

export interface ConfigBalanza {
    activa: boolean;               // usar balanza en esta computadora
    baudRate: number;
    dataBits: 7 | 8;
    parity: 'none' | 'even' | 'odd';
    stopBits: 1 | 2;
    comando: ComandoBalanza;       // qué se le manda para pedir el peso
    comandoPersonalizado: string;  // texto libre; acepta \r \n \x05
    unidad: UnidadBalanza;         // AUTO = lo que diga la balanza (si no dice nada, kg)
    lecturasIguales: number;       // si la balanza no dice "estable", cuántas lecturas iguales seguidas lo confirman
}

export const CONFIG_POR_DEFECTO: ConfigBalanza = {
    activa: false,
    baudRate: 9600,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
    comando: 'NINGUNO',
    comandoPersonalizado: '',
    unidad: 'AUTO',
    lecturasIguales: 3,
};

export type EstadoBalanza = 'no-disponible' | 'desconectada' | 'conectando' | 'conectada' | 'error';

export interface LecturaPeso {
    kg: number;          // siempre en kilos (o litros, para productos por LT)
    estable: boolean;
    texto: string;       // lo que mandó la balanza, tal cual (sirve para diagnosticar)
    hora: number;        // Date.now()
}

export interface SnapshotBalanza {
    estado: EstadoBalanza;
    lectura: LecturaPeso | null;
    error: string | null;
    config: ConfigBalanza;
}

const CLAVE_CONFIG = 'balanza_config';
const CLAVE_PUERTO = 'balanza_puerto';

// =====================================================================
// Interpretar lo que manda la balanza (función pura: fácil de probar)
// =====================================================================

/**
 * Convierte una línea de la balanza en una lectura. null si la línea no trae un peso.
 * estable: true / false si la balanza lo indica (ST / US), null si no dice nada.
 */
export function interpretarLinea(texto: string, unidad: UnidadBalanza = 'AUTO'): { kg: number; estable: boolean | null } | null {
    // eslint-disable-next-line no-control-regex -- las balanzas mandan STX, ETX, CR... que se descartan
    const limpio = texto.replace(/[\x00-\x1f\x7f]/g, ' ').trim();
    if (!limpio) return null;

    // Número (con signo opcional separado por espacios) y unidad opcional pegada o con espacio
    const regex = /([-+])?\s*(\d+(?:[.,]\d+)?)\s*(kg|g|lb|oz)?\b/gi;
    let elegido: RegExpExecArray | null = null;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(limpio)) !== null) {
        if (m[3]) { elegido = m; break; }   // el número que va con unidad es el peso
        elegido = m;                        // si ninguno tiene unidad, se queda el último
    }
    if (!elegido) return null;

    let valor = Number(elegido[2].replace(',', '.'));
    if (!Number.isFinite(valor)) return null;
    if (elegido[1] === '-') valor = -valor;

    const unidadTexto = (elegido[3] ?? '').toLowerCase();
    const u = unidad !== 'AUTO' ? unidad : unidadTexto === 'g' ? 'G' : unidadTexto === 'lb' ? 'LB' : unidadTexto === 'oz' ? 'OZ' : 'KG';
    const kg = u === 'G' ? valor / 1000 : u === 'LB' ? valor * 0.45359237 : u === 'OZ' ? valor * 0.028349523 : valor;

    // Indicadores de estabilidad que usan la mayoría de marcas
    let estable: boolean | null = null;
    if (/\b(US|MOTION|UNSTABLE)\b|\?/i.test(limpio)) estable = false;
    else if (/\bST\b|\bSTABLE\b/i.test(limpio)) estable = true;
    if (/\b(OL|OVER|ERR)\b/i.test(limpio)) return null;   // sobrecarga / error

    return { kg: Math.round(kg * 1000) / 1000, estable };
}

/** "W\r" → bytes. Acepta \r, \n, \t y \xNN escritos como texto */
export function comandoABytes(config: ConfigBalanza): Uint8Array | null {
    const texto = {
        NINGUNO: null,
        W: 'W',
        P: 'P',
        S: 'S\r\n',
        ENQ: '\x05',
        PERSONALIZADO: config.comandoPersonalizado
            .replace(/\\r/g, '\r').replace(/\\n/g, '\n').replace(/\\t/g, '\t')
            .replace(/\\x([0-9a-f]{2})/gi, (_, h: string) => String.fromCharCode(parseInt(h, 16))),
    }[config.comando];
    if (!texto) return null;
    return new Uint8Array([...texto].map((c) => c.charCodeAt(0) & 0xff));
}

// =====================================================================
// Conexión (una sola para toda la página)
// =====================================================================

function leerConfig(): ConfigBalanza {
    try {
        const guardada = localStorage.getItem(CLAVE_CONFIG);
        if (guardada) return { ...CONFIG_POR_DEFECTO, ...JSON.parse(guardada) };
    } catch { /* sin almacenamiento o dato roto */ }
    return { ...CONFIG_POR_DEFECTO };
}

export const balanzaDisponible = (): boolean =>
    typeof navigator !== 'undefined' && !!navigator.serial && window.isSecureContext;

class Balanza {
    private puerto: SerialPort | null = null;
    private abriendo: Promise<void> | null = null;   // evita abrir el mismo puerto dos veces a la vez
    private lector: ReadableStreamDefaultReader<Uint8Array> | null = null;
    private buffer = '';
    private iguales = 0;
    private snapshot: SnapshotBalanza = {
        estado: balanzaDisponible() ? 'desconectada' : 'no-disponible',
        lectura: null,
        error: null,
        config: leerConfig(),
    };
    private oyentes = new Set<() => void>();

    // ---- Para React (useSyncExternalStore) ----
    suscribir = (oyente: () => void) => {
        this.oyentes.add(oyente);
        return () => { this.oyentes.delete(oyente); };
    };

    obtener = () => this.snapshot;

    private publicar(cambios: Partial<SnapshotBalanza>) {
        this.snapshot = { ...this.snapshot, ...cambios };
        this.oyentes.forEach((o) => o());
    }

    // ---- Configuración ----
    guardarConfig(config: ConfigBalanza) {
        try { localStorage.setItem(CLAVE_CONFIG, JSON.stringify(config)); } catch { /* solo en memoria */ }
        const cambiaPuerto = ['baudRate', 'dataBits', 'parity', 'stopBits'].some(
            (k) => config[k as keyof ConfigBalanza] !== this.snapshot.config[k as keyof ConfigBalanza]);
        this.publicar({ config });
        // Los parámetros del puerto solo se aplican al abrirlo: se reconecta
        if (cambiaPuerto && this.puerto) {
            const p = this.puerto;
            this.desconectar().then(() => this.abrir(p));
        }
        if (!config.activa && this.puerto) this.desconectar();
    }

    // ---- Conectar ----

    /** Pide al usuario que elija el puerto (debe llamarse desde un clic) */
    async conectar() {
        if (!balanzaDisponible() || this.abriendo) return;
        if (this.puerto) await this.desconectar();
        try {
            const puerto = await navigator.serial!.requestPort();
            const info = puerto.getInfo();
            try { localStorage.setItem(CLAVE_PUERTO, JSON.stringify(info)); } catch { /* nada */ }
            await this.abrir(puerto);
        } catch (e) {
            // Cerrar el diálogo sin elegir no es un error
            if (e instanceof DOMException && e.name === 'NotFoundError') return;
            this.publicar({ estado: 'error', error: mensajeError(e) });
        }
    }

    /** Al abrir la página: si ya se dio permiso antes, se conecta sola (sin diálogo) */
    async reconectar() {
        if (!balanzaDisponible() || !this.snapshot.config.activa || this.puerto || this.abriendo) return;
        try {
            const puertos = await navigator.serial!.getPorts();
            if (puertos.length === 0) return;
            let info: SerialPortInfo = {};
            try { info = JSON.parse(localStorage.getItem(CLAVE_PUERTO) ?? '{}'); } catch { /* nada */ }
            const puerto = puertos.find((p) => {
                const i = p.getInfo();
                return i.usbVendorId === info.usbVendorId && i.usbProductId === info.usbProductId;
            }) ?? puertos[0];
            await this.abrir(puerto);
        } catch (e) {
            this.publicar({ estado: 'error', error: mensajeError(e) });
        }
    }

    private async abrir(puerto: SerialPort) {
        if (this.abriendo) return this.abriendo;
        const c = this.snapshot.config;
        this.publicar({ estado: 'conectando', error: null });
        this.abriendo = puerto.open({ baudRate: c.baudRate, dataBits: c.dataBits, parity: c.parity, stopBits: c.stopBits });
        try {
            await this.abriendo;
        } catch (e) {
            this.publicar({ estado: 'error', error: mensajeError(e) });
            return;
        } finally {
            this.abriendo = null;
        }
        this.puerto = puerto;
        this.buffer = '';
        this.iguales = 0;
        this.publicar({ estado: 'conectada', lectura: null });
        void this.bucleLectura(puerto);
    }

    async desconectar() {
        const puerto = this.puerto;
        this.puerto = null;
        try { await this.lector?.cancel(); } catch { /* ya estaba cerrado */ }
        try { await puerto?.close(); } catch { /* ya estaba cerrado */ }
        this.lector = null;
        this.publicar({ estado: balanzaDisponible() ? 'desconectada' : 'no-disponible', lectura: null });
    }

    private async bucleLectura(puerto: SerialPort) {
        const decodificador = new TextDecoder('latin1');
        while (puerto.readable && this.puerto === puerto) {
            this.lector = puerto.readable.getReader();
            try {
                for (;;) {
                    const { value, done } = await this.lector.read();
                    if (done) break;
                    if (value) this.recibir(decodificador.decode(value, { stream: true }));
                }
            } catch (e) {
                // Se desenchufó el cable o hubo un error de lectura
                if (this.puerto === puerto) {
                    this.puerto = null;
                    try { await puerto.close(); } catch { /* nada */ }
                    this.publicar({ estado: 'error', error: `Se perdió la conexión con la balanza (${mensajeError(e)})`, lectura: null });
                }
            } finally {
                this.lector?.releaseLock();
            }
        }
    }

    /** Junta los pedazos que llegan hasta tener una línea completa */
    private recibir(trozo: string) {
        this.buffer += trozo;
        // eslint-disable-next-line no-control-regex -- CR, LF, STX y ETX separan las lecturas
        const partes = this.buffer.split(/[\r\n\x02\x03]+/);
        this.buffer = partes.pop() ?? '';
        if (this.buffer.length > 200) {            // balanza sin fin de línea: se procesa igual
            partes.push(this.buffer);
            this.buffer = '';
        }
        for (const linea of partes) this.procesarLinea(linea);
    }

    private procesarLinea(linea: string) {
        const r = interpretarLinea(linea, this.snapshot.config.unidad);
        if (!r) return;
        const anterior = this.snapshot.lectura;
        this.iguales = anterior && Math.abs(anterior.kg - r.kg) < 0.0005 ? this.iguales + 1 : 1;
        const estable = r.estable ?? this.iguales >= Math.max(1, this.snapshot.config.lecturasIguales);
        this.publicar({ lectura: { kg: r.kg, estable, texto: linea.trim(), hora: Date.now() }, error: null });
    }

    // ---- Pedir el peso ----

    /**
     * Devuelve el peso estable actual. Si la balanza necesita un comando, se lo manda.
     * Falla si no hay balanza, si no responde o si el peso no se queda quieto.
     */
    async pesar(esperaMs = 3000): Promise<number> {
        if (!this.puerto || this.snapshot.estado !== 'conectada') {
            throw new Error('La balanza no está conectada');
        }
        const pedidoEn = Date.now();
        const comando = comandoABytes(this.snapshot.config);
        if (comando && this.puerto.writable) {
            const escritor = this.puerto.writable.getWriter();
            try { await escritor.write(comando); } finally { escritor.releaseLock(); }
        }

        // En modo continuo sirve una lectura estable reciente; con comando, una posterior al pedido
        const valida = (l: LecturaPeso | null) =>
            !!l && l.estable && (comando ? l.hora >= pedidoEn : Date.now() - l.hora < 1500);

        const actual = this.snapshot.lectura;
        if (valida(actual)) return actual!.kg;

        return new Promise<number>((resolve, reject) => {
            const quitar = this.suscribir(() => {
                const l = this.snapshot.lectura;
                if (valida(l)) { clearTimeout(timer); quitar(); resolve(l!.kg); }
            });
            const timer = setTimeout(() => {
                quitar();
                const l = this.snapshot.lectura;
                reject(new Error(l && l.hora >= pedidoEn
                    ? 'El peso no se estabiliza: espera a que el producto deje de moverse'
                    : 'La balanza no respondió. Revisa el cable y la configuración (velocidad / comando).'));
            }, esperaMs);
        });
    }
}

function mensajeError(e: unknown): string {
    if (e instanceof DOMException && e.name === 'InvalidStateError') return 'el puerto ya está abierto en otro programa o pestaña';
    if (e instanceof DOMException && e.name === 'NetworkError') return 'no se pudo abrir el puerto (¿lo usa otro programa?)';
    return e instanceof Error ? e.message : String(e);
}

export const balanza = new Balanza();
