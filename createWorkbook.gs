// =====================================================
// createWorkbook.gs — GENERACIÓN DEL LIBRO DESTINO
// =====================================================
//
// Crea las hojas con la disposición esperada por las
// funciones updateXxx de main.gs. Cada hoja se crea con:
//   - Encabezado de columnas (fila 1, en negrita, congelada)
//   - Color de pestaña según el anexo de origen
//   - Rango nombrado abarcando la fila de encabezado
//
// El proceso es idempotente: si una hoja ya existe se
// omite (no se modifica). Para regenerar una hoja, basta
// con eliminarla manualmente y volver a ejecutar.

// ─── PALETA DE COLORES (clasificación por anexo) ────────────────────────────────────
const COLORES_PESTANA = {
  VERDE:  "#b7e1cd",  // anexo "Empleo y desempleo"
  ROJO:   "#f4cccc",  // anexo "Empleo informal y seguridad social"
  AZUL:   "#cfe2f3",  // anexo "Mercado laboral de la juventud"
  ROSADO: "#ead1dc",  // anexo "Mercado laboral según sexo"
};

// ─── DISPOSICIÓN DE LAS HOJAS ────────────────────────────────────────────────────────
//
// El orden de cada `columnas` debe coincidir EXACTAMENTE con el orden en
// que las funciones updateXxx de main.gs escriben los datos (col 1 = Año,
// col 2 = Trimestre, col 3+ = datos). Cambiar el orden aquí rompe la
// correspondencia con las llamadas a setValues().

const DISPOSICION_HOJAS = [
  {
    nombre:        "Monteria",
    rangoNombrado: "Monteria",
    color:         COLORES_PESTANA.VERDE,
    columnas: [
      "Año", "Trimestre movil",
      "% PET", "TGP", "TO", "TD", "TS",
      "Población total", "PET", "Fuerza de trabajo",
      "Población ocupada", "Población desocupada",
      "PFFT", "Subocupados", "Fuerza de trabajo potencial"
    ]
  },
  {
    nombre:        "TD pares regionales",
    rangoNombrado: "TD_Ciudades_costa_caribe",
    color:         COLORES_PESTANA.VERDE,
    columnas: [
      "Año", "Trimestre movil",
      "TD-Montería", "TD-Riohacha", "TD-Valledupar",
      "TD-Santa Marta", "TD-Barranquilla",
      "TD-Cartagena", "TD-Sincelejo"
    ]
  },
  {
    nombre:        "TD pares economicos",
    rangoNombrado: "TD_Ciudades_comp_econ",
    color:         COLORES_PESTANA.VERDE,
    columnas: [
      "Año", "Trimestre movil",
      "TD-Montería", "TD-Neiva", "TD-Santa Marta",
      "TD-Pasto", "TD-Valledupar", "TD-Popayán", "TD-Armenia"
    ]
  },
  {
    nombre:        "Distribucion PFFT",
    rangoNombrado: "Distribucion_PFFT",
    color:         COLORES_PESTANA.VERDE,
    columnas: [
      "Año", "Trimestre movil",
      "Estudiando", "Oficios del hogar", "Otros"
    ]
  },
  {
    nombre:        "Ocupados Monteria por ramas",
    rangoNombrado: "ocupados_Monteria_segun_rama",
    color:         COLORES_PESTANA.VERDE,
    columnas: [
      "Año", "Trimestre movil",
      "Población ocupada", "No informa",
      "Agricultura, ganadería, caza, silvicultura y pesca",
      "Explotación de minas y canteras",
      "Industrias manufactureras",
      "Suministro de electricidad gas, agua y gestión de desechos",
      "Construcción",
      "Comercio y reparación de vehículos",
      "Alojamiento y servicios de comida",
      "Transporte y almacenamiento",
      "Información y comunicaciones",
      "Actividades financieras y de seguros",
      "Actividades inmobiliarias",
      "Actividades profesionales, científicas, técnicas y servicios administrativos",
      "Administración pública y defensa, educación y atención de la salud humana",
      "Actividades artísticas, entretenimiento, recreación y otras actividades de servicios"
    ]
  },
  {
    nombre:        "Formales e informales Monteria",
    rangoNombrado: "formales_e_informales",
    color:         COLORES_PESTANA.ROJO,
    columnas: [
      "Año", "Trimestre movil",
      "Población ocupada", "Formal", "Informal"
    ]
  },
  {
    nombre:        "Proporcion de Informalidad",
    rangoNombrado: "Informalidad",
    color:         COLORES_PESTANA.ROJO,
    columnas: [
      "Año", "Trimestre movil",
      "Total nacional", "13 Ciudades y A.M.", "23 Ciudades y A.M.",
      "Bogotá D.C.", "Medellín A.M.", "Cali A.M.", "Barranquilla A.M.",
      "Bucaramanga A.M.", "Manizales A.M.", "Pasto", "Pereira A.M.",
      "Cúcuta A.M.", "Ibagué", "Montería", "Cartagena", "Villavicencio",
      "Tunja", "Florencia", "Popayán", "Valledupar", "Quibdó",
      "Neiva", "Riohacha", "Santa Marta", "Armenia", "Sincelejo"
    ]
  },
  {
    nombre:        "Monteria Joven",
    rangoNombrado: "Monteria_Joven",
    color:         COLORES_PESTANA.AZUL,
    columnas: [
      "Año", "Trimestre movil",
      "% PET Joven", "TGP Joven", "TO Joven", "TD Joven",
      "% PFFT Joven / PET Joven",
      "PET", "PET Joven", "FT Joven",
      "PO Joven", "PD Joven", "PFFT Joven"
    ]
  },
  {
    nombre:        "Monteria por sexo",
    rangoNombrado: "Monteria_por_S",
    color:         COLORES_PESTANA.ROSADO,
    columnas: [
      "Año", "Trimestre movil",
      "% PET-Hombres", "TGP-Hombres", "TO-Hombres", "TD-Hombres",
      "Población total (Hombres)", "PET-Hombres",
      "FT-Hombres", "PO-Hombres", "PD-Hombres",
      "% PET-Mujeres", "TGP-Mujeres", "TO-Mujeres", "TD-Mujeres",
      "Población total (Mujeres)", "PET-Mujeres",
      "FT-Mujeres", "PO-Mujeres", "PD-Mujeres"
    ]
  }
];

// ─── CONSTRUCTOR DE HOJA INDIVIDUAL ──────────────────────────────────────────────────

/**
 * Crea una hoja con su encabezado, color de pestaña y rango nombrado.
 * Si el rango nombrado ya existe en el libro (huérfano de una hoja borrada),
 * se elimina antes de crearlo nuevamente.
 */
function crearHojaConDisposicion(libro, config) {
  const hoja    = libro.insertSheet(config.nombre);
  const numCols = config.columnas.length;

  // Encabezado: escribirlo, en negrita y congelado.
  const encabezado = hoja.getRange(1, 1, 1, numCols);
  encabezado.setValues([config.columnas]);
  encabezado.setFontWeight("bold");
  hoja.setFrozenRows(1);

  // Color de pestaña.
  hoja.setTabColor(config.color);

  // Limpiar rango nombrado previo con el mismo nombre (si lo hubiera).
  libro.getNamedRanges()
       .filter(r => r.getName() === config.rangoNombrado)
       .forEach(r => r.remove());

  // Rango nombrado: solo la fila de encabezado por ahora.
  // actualizarRangoNombrado() de main.gs lo extenderá tras la primera
  // actualización de datos.
  libro.setNamedRange(config.rangoNombrado, encabezado);
}

// ─── FUNCIÓN PRINCIPAL ──────────────────────────────────────────────────────────────

function crearHojasDisposicion() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();

  // Clasificar hojas existentes vs faltantes.
  const existentes = new Set(libro.getSheets().map(h => h.getName()));
  const faltantes  = DISPOSICION_HOJAS.filter(c => !existentes.has(c.nombre));
  const omitidas   = DISPOSICION_HOJAS.filter(c =>  existentes.has(c.nombre));

  if (faltantes.length === 0) {
    Browser.msgBox(
      "Disposición completa",
      "Todas las hojas con la disposición esperada ya existen en este libro. " +
      "No hay nada que crear.",
      Browser.Buttons.OK
    );
    return;
  }

  const listaFaltantes = faltantes.map(c => `• ${c.nombre}`).join("\n");
  const listaOmitidas  = omitidas.length > 0
    ? `\n\nHojas ya existentes (no se modificarán):\n` +
      omitidas.map(c => `• ${c.nombre}`).join("\n")
    : "";

  const eleccion = Browser.msgBox(
    "Crear hojas con la disposición",
    `Se van a crear ${faltantes.length} hoja(s):\n\n${listaFaltantes}${listaOmitidas}\n\n¿Continuar?`,
    Browser.Buttons.YES_NO
  );
  if (eleccion !== "yes") return;

  faltantes.forEach(config => crearHojaConDisposicion(libro, config));
  SpreadsheetApp.flush();

  Browser.msgBox(
    "✅ Listo",
    `Se crearon ${faltantes.length} hoja(s) con la disposición esperada. ` +
    `Ya puedes usar las opciones de actualización del menú.`,
    Browser.Buttons.OK
  );
}
