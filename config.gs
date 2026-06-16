// =====================================================
// config.gs — CONFIGURACIÓN DEL ESQUEMA DEL DANE
// =====================================================
//
// Constantes que mapean la estructura física de los anexos
// del DANE: en qué fila viven los marcadores de año, en qué
// fila las etiquetas de trimestre, y qué filas contienen los
// datos de las ciudades específicas que nos interesan.
//
// Estos valores son sensibles a cambios en la disposición de
// los anexos del DANE. Si en una publicación futura se mueven
// filas o se inserta una sección nueva, los números aquí
// declarados deben actualizarse.

// ─── ENCABEZADOS DE LAS HOJAS FUENTE ────────────────────────────────────────────────
//
//  yearRow  : fila con los marcadores de año (valor numérico, fill-forward)
//  monthRow : fila con las etiquetas de trimestre ('Ene - Mar', etc.)

const SHEET_CONFIG = {
  EMPLEO_DESEMPLEO:  { yearRow: 221, monthRow: 222 },
  PFFT:              { yearRow:  73, monthRow:  74 },   // subsección Montería en Pob_fuera...
  RAMAS:             { yearRow: 144, monthRow: 145 },   // subsección Montería en Ocupados...
  INFORMALIDAD:      { yearRow:  11, monthRow:  12 },
  INFORMALIDAD_PROP: { yearRow:  11, monthRow:  12 },
  JUVENTUD:          { yearRow: 201, monthRow: 202 },   // incluye año en cada celda ('Ene - Mar 26')
  SEXO:              { yearRow: 185, monthRow: 186 },
};

// ─── FILAS DE CIUDADES EN "Total 23 ciudades A.M. Trim" ─────────────────────────────
//
// Posiciones de cada ciudad dentro de la hoja principal del anexo
// "Empleo y desempleo". El orden de los arreglos determina el orden
// en que se escriben las columnas de las hojas destino "TD pares
// regionales" y "TD pares economicos".

const FILAS_PARES_REGIONALES = [226, 397, 340, 416,  93, 245, 454];
const FILAS_PARES_ECONOMICOS = [226, 378, 416, 150, 340, 321, 435];
