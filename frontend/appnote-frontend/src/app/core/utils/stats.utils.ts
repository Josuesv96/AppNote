/**
 * Utilidades estadísticas compartidas.
 *
 * Centraliza el cálculo de regresión lineal que antes estaba duplicado
 * en paciente.component.ts y terapeuta.component.ts.
 *
 * El eje X siempre es el índice de la muestra (0, 1, 2, ...), es decir,
 * la posición temporal de cada registro ordenado.
 */

export interface RegresionLineal {
  /** Pendiente de la recta (cuánto cambia el valor por cada paso). */
  pendiente: number;
  /** Intercepto (valor estimado en la posición 0). */
  intercepto: number;
}

/**
 * Calcula la pendiente e intercepto de la recta de mínimos cuadrados
 * para una serie de valores, usando el índice como eje X.
 *
 * Devuelve { pendiente: 0, intercepto: 0 } cuando no hay datos suficientes
 * o cuando el denominador es 0 (evita resultados NaN).
 */
export function regresionLineal(valores: number[]): RegresionLineal {
  const n = valores.length;
  if (n === 0) return { pendiente: 0, intercepto: 0 };

  const sumX = valores.reduce((acc, _, i) => acc + i, 0);
  const sumY = valores.reduce((acc, y) => acc + y, 0);
  const sumXY = valores.reduce((acc, y, i) => acc + i * y, 0);
  const sumX2 = valores.reduce((acc, _, i) => acc + i * i, 0);

  const denom = n * sumX2 - sumX * sumX;
  const pendiente = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercepto = (sumY - pendiente * sumX) / n;

  return { pendiente, intercepto };
}

/**
 * Devuelve solo la pendiente de la regresión (atajo cuando no se
 * necesita la recta completa, solo la tendencia).
 */
export function pendienteRegresion(valores: number[]): number {
  return regresionLineal(valores).pendiente;
}

/**
 * Genera los puntos de la recta de tendencia (un valor por cada muestra),
 * redondeados a 2 decimales. Útil para dibujar la línea de tendencia
 * en las gráficas.
 */
export function lineaTendencia(valores: number[]): number[] {
  const { pendiente, intercepto } = regresionLineal(valores);
  return valores.map((_, i) => +(pendiente * i + intercepto).toFixed(2));
}