// =====================================================
// helpers.gs — UTILIDADES REUTILIZABLES
// =====================================================
//
// Biblioteca de funciones sin estado usadas por las funciones
// updateXxx de main.gs. Cubre:
//   - Helpers genéricos sobre hojas (apertura, rangos nombrados)
//   - Parseo de encabezados de período del DANE
//   - Comparación contra el destino (períodos registrados)
//   - Lectura/escritura en lote desde y hacia hojas
//
// Estructura de encabezado en los archivos fuente:
//   → Fila de AÑOS   : valor numérico (ej: 2007) solo en la primera
//                       columna de cada año; se propaga forward.
//   → Fila de MESES  : etiqueta del trimestre ('Ene - Mar',
//                       'Nov 25 - Ene 26', 'Ene - Mar 26', etc.)
//   → El año del trimestre se extrae del año abreviado en la celda
//     cuando lo hay (ej: '25' → 2025), o del fill-forward de la
//     fila de años cuando no (ej: 'Ene - Mar' → contextYear).

// ─── HELPERS GENÉRICOS ────────────────────────────────────────────────────────────────

function actualizarRangoNombrado(hoja) {
  const rangos = hoja.getNamedRanges();
  if (rangos.length > 0) {
    rangos[0].setRange(
      hoja.getRange(1, 1, hoja.getLastRow(), hoja.getLastColumn())
    );
  }
}

function abrirLibro(nombre) {
  const iter = DriveApp.getFilesByName(nombre);
  if (!iter.hasNext()) {
    throw new Error(
      `No se encontró "${nombre}" en Drive. ` +
      `Ejecute primero "Descargar archivos del DANE".`
    );
  }
  return SpreadsheetApp.open(iter.next());
}

// ─── PARSEO DE ENCABEZADO DE PERÍODO ─────────────────────────────────────────────────

/**
 * Extrae año y trimestre normalizado de una celda de encabezado del DANE.
 *
 * Los archivos del DANE usan tres formatos de celda en la fila de meses:
 *   A) 'Ene - Mar'          → año proviene de contextYear (fill-forward de fila de años)
 *   B) 'Nov 25 - Ene 26'    → año = primer número de 2 dígitos en la celda ('25' → 2025)
 *   C) 'Ene - Mar 26'       → igual que B ('26' → 2026); exclusivo de GEIHMLJ
 *
 * @param {*}       rawValue    - Valor crudo de la celda (puede ser string, number, null)
 * @param {number}  contextYear - Año del marcador más reciente en la fila de años
 * @returns {{ year: string, trim: string, key: string } | null}
 */
function parsePeriodHeader(rawValue, contextYear) {
  if (rawValue == null) return null;
  const str  = String(rawValue).trim();
  if (!str)  return null;

  // Extraer el trimestre: quitar dígitos, espacios y anotaciones (*, †, ‡).
  // El DANE marca con '*' los trimestres de 2020 afectados por la pandemia
  // (ej: 'Ene - Mar*'). El destino guarda esos períodos sin asterisco para
  // unificar el formato con el resto de la serie histórica.
  let trim = str.replace(/\d+/g, "")
                .replace(/\s+/g, "")
                .replace(/[^A-Za-záéíóúüñÑ\-]/g, "");
  if (!trim || !/[A-Za-záéíóúüñÑ]/.test(trim)) return null;

  // Normalizar a Title Case ('May-Jul', 'Oct-Dic', etc.).
  // Cubre dos escenarios reales del DANE:
  //   - GEIHEISS usa todos los meses en minúscula  ('Ene - mar')
  //   - GEIHMLJ tiene errores tipográficos esporádicos
  //     ('May - jul 22', 'Oct - dic 22')
  // Tras esta normalización, el formato siempre es 'Xxx-Yyy'.
  trim = trim.split("-")
             .map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
             .join("-");

  let year;

  // Buscar año de 2 dígitos dentro de la celda (formatos B y C)
  const twoDigit = str.match(/\b(\d{2})\b/);
  if (twoDigit) {
    // Primer par de dígitos = año del mes de inicio del trimestre
    year = String(2000 + parseInt(twoDigit[1], 10));
  } else if (contextYear != null) {
    // Formato A: sin dígitos en la celda → usar año del contexto
    year = String(contextYear);
  } else {
    return null;
  }

  return { year, trim, key: `${year}|${trim}` };
}

// ─── LECTURA DE PERÍODOS DESDE HOJA FUENTE ───────────────────────────────────────────

/**
 * Lee las dos filas de encabezado del DANE (años + meses) y devuelve la lista
 * ordenada de períodos disponibles, con su número de columna.
 *
 * La fila de años contiene marcadores numéricos (2007, 2008, …) dispersos;
 * el valor se propaga forward hasta el siguiente marcador.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {number}   yearRow   - Fila con los marcadores de año
 * @param {number}   monthRow  - Fila con las etiquetas de trimestre
 * @returns {Array<{ col: number, year: string, trim: string, key: string }>}
 */
function buildPeriodList(sheet, yearRow, monthRow) {
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) return [];

  const yearCells  = sheet.getRange(yearRow,  1, 1, lastCol).getValues()[0];
  const monthCells = sheet.getRange(monthRow, 1, 1, lastCol).getValues()[0];

  let contextYear = null;
  const result    = [];

  for (let i = 0; i < monthCells.length; i++) {
    // Actualizar contextYear con el marcador de la fila de años (si es un número válido)
    const rawYear = yearCells[i];
    if (rawYear != null && rawYear !== "") {
      const n = Number(rawYear);
      if (!isNaN(n) && n > 1900 && n < 2200) contextYear = Math.floor(n);
    }

    const rawMonth = monthCells[i];
    if (rawMonth == null || String(rawMonth).trim() === "") continue;

    const parsed = parsePeriodHeader(rawMonth, contextYear);
    if (!parsed) continue;

    result.push({ ...parsed, col: i + 1 });
  }

  return result;
}

/**
 * Igual que buildPeriodList pero devuelve un mapa { key → columnNumber } para O(1).
 */
function buildPeriodMap(sheet, yearRow, monthRow) {
  return Object.fromEntries(
    buildPeriodList(sheet, yearRow, monthRow).map(p => [p.key, p.col])
  );
}

// ─── LECTURA DEL DESTINO ─────────────────────────────────────────────────────────────

/**
 * Devuelve los períodos ya registrados en la hoja destino como un Set de claves.
 * Supone: col 1 = año, col 2 = trimestre, fila 1 = encabezado.
 */
function getRegisteredPeriods(hoja) {
  const lastRow = hoja.getLastRow();
  if (lastRow < 2) return new Set();
  const datos = hoja.getRange(2, 1, lastRow - 1, 2).getValues();
  return new Set(
    datos
      .filter(r => String(r[0]).trim() !== "" && String(r[1]).trim() !== "")
      .map(r => `${String(r[0]).trim()}|${String(r[1]).trim()}`)
  );
}

function findMissingPeriods(sourcePeriods, registeredSet) {
  return sourcePeriods.filter(p => !registeredSet.has(p.key));
}

/**
 * Muestra los períodos faltantes al usuario y solicita confirmación.
 * @returns {boolean} true si el usuario confirma
 */
function confirmarPeriodos(periodosFaltantes, contexto) {
  if (periodosFaltantes.length === 0) {
    Browser.msgBox(contexto,
      "Todos los períodos ya están al día. No hay nada que actualizar.",
      Browser.Buttons.OK);
    return false;
  }
  const lista    = periodosFaltantes.map(p => `• ${p.trim} ${p.year}`).join("\n");
  const eleccion = Browser.msgBox(
    `Períodos pendientes — ${contexto}`,
    `Períodos sin registrar (${periodosFaltantes.length}):\n\n${lista}\n\n¿Continuar?`,
    Browser.Buttons.YES_NO
  );
  return eleccion === "yes";
}

// ─── LECTURA EN LOTE DESDE FUENTE ────────────────────────────────────────────────────

/**
 * Lee filas CONTIGUAS para columnas específicas.
 * Una sola llamada a getRange() para todo el bloque.
 * @returns {number[][]} [numRows × cols.length]
 */
function leerBloqueYColumnas(sheet, startRow, numRows, cols) {
  if (numRows === 0 || cols.length === 0) return [];
  const minCol  = Math.min(...cols);
  const colSpan = Math.max(...cols) - minCol + 1;
  const bloque  = sheet.getRange(startRow, minCol, numRows, colSpan).getValues();
  return bloque.map(fila => cols.map(col => fila[col - minCol]));
}

/**
 * Lee filas NO CONTIGUAS para columnas específicas.
 * Una llamada a getRange() por fila.
 * @returns {number[][]} [rows.length × cols.length]
 */
function leerFilasYColumnas(sheet, rows, cols) {
  if (rows.length === 0 || cols.length === 0) return [];
  const minCol  = Math.min(...cols);
  const colSpan = Math.max(...cols) - minCol + 1;
  return rows.map(fila => {
    const datosFila = sheet.getRange(fila, minCol, 1, colSpan).getValues()[0];
    return cols.map(col => datosFila[col - minCol]);
  });
}

// ─── HELPERS PARA HOJAS SECUNDARIAS ──────────────────────────────────────────────────

/**
 * Para una hoja secundaria con su propio mapa de períodos:
 *   - Resuelve qué columna le corresponde a cada período faltante
 *   - Lee los datos en lote para esas columnas
 *
 * @param {Sheet}    srcSecundaria
 * @param {number}   yearRow, monthRow  - Filas de encabezado de esa hoja
 * @param {number}   dataStartRow       - Primera fila de datos
 * @param {number}   dataNumRows        - Cantidad de filas de datos
 * @param {Array}    periodosFaltantes
 */
function prepararHojaSecundaria(srcSecundaria, yearRow, monthRow,
                                 dataStartRow, dataNumRows,
                                 periodosFaltantes) {
  const mapSecundaria  = buildPeriodMap(srcSecundaria, yearRow, monthRow);
  const colsForPeriods = periodosFaltantes.map(p => mapSecundaria[p.key] || null);
  const uniqueCols     = [...new Set(colsForPeriods.filter(Boolean))].sort((a, b) => a - b);
  const colToOffset    = Object.fromEntries(uniqueCols.map((col, i) => [col, i]));
  const rawData        = uniqueCols.length > 0
    ? leerBloqueYColumnas(srcSecundaria, dataStartRow, dataNumRows, uniqueCols)
    : [];
  return { colsForPeriods, rawData, colToOffset };
}

/**
 * Construye la matriz de escritura [N × numCols] desde datos pre-leídos.
 * Rellena con vacío si un período no tiene columna en la hoja secundaria.
 */
function buildWriteMatrix(periodosFaltantes, colsForPeriods, rawData, colToOffset, numCols) {
  return periodosFaltantes.map((p, i) => {
    const col = colsForPeriods[i];
    if (!col) {
      Logger.log("ADVERTENCIA: período %s no encontrado en hoja secundaria.", p.key);
      return new Array(numCols).fill("");
    }
    return rawData.map(r => r[colToOffset[col]]);
  });
}
