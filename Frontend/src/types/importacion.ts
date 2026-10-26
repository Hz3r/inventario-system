// src/types/importacion.ts
// Espejo de ImportacionResponse

export type TipoImportacion = 'productos' | 'clientes' | 'proveedores';

export type AccionImportacion = 'CREAR' | 'ACTUALIZAR' | 'ERROR';

export interface FilaImportacion {
    numero: number;          // fila en Excel
    accion: AccionImportacion;
    descripcion: string | null;
    errores: string[];
    avisos: string[];
}

export interface ImportacionResultado {
    tipo: string;
    confirmado: boolean;     // false = vista previa, no se guardó nada
    total: number;
    nuevos: number;
    actualizados: number;
    conError: number;
    filas: FilaImportacion[];
}
