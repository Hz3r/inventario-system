// src/utils/dinero.ts
// En JavaScript 0.1 + 0.2 = 0.30000000000000004. Para que el total del POS sea
// EXACTAMENTE igual al que calcula el backend, las cuentas se hacen en céntimos (enteros).

/** 5.6 -> 560 (redondeo "hacia arriba" en el .5, igual que HALF_UP de Java) */
export const centavos = (n: number): number => Math.round(Number((n * 100).toFixed(6)));

/** Subtotal de una línea igual que el backend: (precio × cantidad) redondeado a céntimos − descuento */
export const subtotalLineaCent = (precio: number, cantidad: number, descuento: number): number =>
    centavos(precio * cantidad) - centavos(descuento);
