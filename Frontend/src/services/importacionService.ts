// src/services/importacionService.ts
import { api } from './api';
import { fechaISO } from '../utils/formato';
import type { ImportacionResultado, TipoImportacion } from '../types/importacion';

const BASE = '/api/importar';

export const importacionService = {
    /** Vista previa: el backend valida el archivo pero no guarda nada */
    previsualizar: (tipo: TipoImportacion, archivo: File) =>
        api.subir<ImportacionResultado>(`${BASE}/${tipo}`, 'archivo', archivo),

    /** Guarda las filas correctas */
    confirmar: (tipo: TipoImportacion, archivo: File) =>
        api.subir<ImportacionResultado>(`${BASE}/${tipo}?confirmar=true`, 'archivo', archivo),

    descargarPlantilla: (tipo: TipoImportacion) =>
        api.descargar(`${BASE}/${tipo}/plantilla`, `plantilla-${tipo}.xlsx`),

    exportar: (tipo: TipoImportacion) =>
        api.descargar(`${BASE}/${tipo}/exportar`, `${tipo}-${fechaISO(new Date())}.xlsx`),
};
