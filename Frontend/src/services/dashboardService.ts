// src/services/dashboardService.ts
import { Product } from '../types/product';

export const dashboardService = {
    // 1. Obtener la cantidad de productos con stock bajo
    getLowStockCount: (): number => {
        const savedProducts = localStorage.getItem('bodega_productos');
        if (!savedProducts) return 0;

        const products: Product[] = JSON.parse(savedProducts);

        // Contamos los que están en "Bajo Stock" o "Sin Stock"
        const lowStockProducts = products.filter(p => p.status === 'Bajo Stock' || p.status === 'Sin Stock');
        return lowStockProducts.length;
    },

    // Dejamos preparadas las otras funciones para cuando hagamos Ventas y Fiados
    getTodaySalesTotal: (): number => {
        return 0; // Próximamente lo conectaremos al LocalStorage de ventas
    },

    getMonthProfit: (): number => {
        return 0;
    },

    getTotalDebts: (): number => {
        return 0;
    }
};