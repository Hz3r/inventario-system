// src/types/dashboard.ts
// Espejo de DashboardResponse
import type { UnidadMedida } from './inventario';
import type { Caja, Venta } from './pos';
import type { GananciaDia, ProductoRentable } from './ganancia';

export interface ProductoAlerta {
    id: number;
    nombre: string;
    stockActual: number;
    stockMinimo: number | null;
    unidadMedida: UnidadMedida;
}

export interface DashboardData {
    ventasHoy: number;
    ventasHoyCantidad: number;
    ventasAyer: number;
    ventasMes: number;
    gananciaMes: number;
    margenMes: number;
    stockBajoCantidad: number;
    stockBajo: ProductoAlerta[];
    fiadosTotal: number;
    clientesConDeuda: number;
    pedidosPorLlegar: number;
    pedidosPorLlegarMonto: number;
    caja: Caja | null;
    ultimos7Dias: GananciaDia[];
    topSemana: ProductoRentable[];
    ultimasVentas: Venta[];
}
