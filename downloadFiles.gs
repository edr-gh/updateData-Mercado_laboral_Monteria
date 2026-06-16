// =====================================================
// downloadFiles.gs — VERSIÓN REFACTORIZADA
// =====================================================

// ─── CONSTANTES ───────────────────────────────────────

const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const BASE_URL = "https://www.dane.gov.co/files/operaciones/GEIH/";
const NOMBRE_SPREADSHEET = "Análisis Montería";

// ─── HELPERS DE FECHA ─────────────────────────────────

/**
 * Calcula mes y año para la URL de empleo y desempleo (un solo mes previo).
 * @param {Date}   fecha  - Fecha de referencia
 * @param {number} offset - 0 = mes anterior, 1 = dos meses atrás (fallback)
 * @returns {{ mes: string, year: number }}
 */
function calcularMesSimple(fecha, offset = 0) {
  const rawIdx = fecha.getMonth() - 1 - offset;           // puede ser negativo
  return {
    mes:  MESES[((rawIdx % 12) + 12) % 12],               // normalizar al rango [0,11]
    year: rawIdx < 0 ? fecha.getFullYear() - 1 : fecha.getFullYear()
  };
}

/**
 * Calcula los límites del trimestre móvil para las URLs de sexo, juventud e informalidad.
 * @param {Date}   fecha  - Fecha de referencia
 * @param {number} offset - 0 = trimestre más reciente, 1 = trimestre anterior (fallback)
 * @returns {{ initial_month: string, initial_year: string, final_month: string, final_year: string }}
 */
function calcularTrimestreMovil(fecha, offset = 0) {
  const m           = fecha.getMonth();           // 0-based (ene = 0)
  const currentYear = fecha.getFullYear();

  const initRaw  = m - 4 - offset;               // mes inicial (4 meses atrás + offset)
  const finalRaw = m - 2 - offset;               // mes final   (2 meses atrás + offset)

  const initYear  = initRaw  < 0 ? currentYear - 1 : currentYear;
  const finalYear = finalRaw < 0 ? currentYear - 1 : currentYear;

  return {
    initial_month: MESES[((initRaw  % 12) + 12) % 12],
    initial_year:  initYear !== finalYear ? String(initYear) : "",  // omitir si mismo año
    final_month:   MESES[((finalRaw % 12) + 12) % 12],
    final_year:    String(finalYear)
  };
}

// ─── GENERADORES DE URL ────────────────────────────────

function urlEmpleoYDesempleo(fecha, offset = 0) {
  const { mes, year } = calcularMesSimple(fecha, offset);
  return `${BASE_URL}anex-GEIH-${mes}${year}.xlsx`;
}

function urlTrimestreMovil(prefix, fecha, offset = 0) {
  const { initial_month, initial_year, final_month, final_year } = calcularTrimestreMovil(fecha, offset);
  return `${BASE_URL}${prefix}${initial_month}${initial_year}-${final_month}${final_year}.xlsx`;
}

// ─── CLASE DE DESCARGA ─────────────────────────────────

/**
 * Encapsula la descarga de un archivo desde una URL hacia Google Drive.
 * El fetch HTTP se realiza de forma perezosa (solo cuando se necesita).
 */
class Descarga {
  /**
   * @param {string}                           url    - URL del archivo en el servidor del DANE
   * @param {string}                           name   - Nombre con el que se guardará en Drive
   * @param {GoogleAppsScript.Drive.Folder}    folder - Carpeta destino en Drive
   */
  constructor(url, name, folder) {
    this.url    = url;
    this.name   = name;
    this.folder = folder;
    this._response = null;       // se inicializa solo cuando se necesita
  }

  /** Realiza el fetch una única vez y almacena la respuesta. */
  _fetch() {
    if (!this._response) {
      try {
        this._response = UrlFetchApp.fetch(this.url, { muteHttpExceptions: true, method: "get" });
      } catch (e) {
        Logger.log("Error de red al intentar fetch de %s: %s", this.url, e.toString());
      }
    }
    return this._response;
  }

  /** @returns {number} Código HTTP (0 si hubo error de conexión). */
  responseCode() {
    const resp = this._fetch();
    return resp ? resp.getResponseCode() : 0;
  }

  /** @returns {boolean} true si el archivo está disponible en el servidor. */
  disponible() {
    return this.responseCode() === 200;
  }

  /** Descarga el blob y crea el archivo en la carpeta de Drive. */
  download() {
    const resp = this._fetch();
    if (!resp) throw new Error(`Sin respuesta del servidor: ${this.url}`);
    const blob = resp.getBlob();
    blob.setName(this.name);
    this.folder.createFile(blob);
    Logger.log("Descargado: %s desde %s", this.name, this.url);
  }
}

// ─── GESTOR GENÉRICO DE DESCARGA ──────────────────────

/**
 * Maneja los cuatro escenarios de descarga:
 *   (disponible | no disponible) × (existe en carpeta | no existe)
 *
 * @param {Descarga}            descarga         - Objeto Descarga principal (URL actual)
 * @param {boolean}             existeEnCarpeta  - true si el archivo ya está en la carpeta
 * @param {function(): Descarga} getFallback     - Función que crea el Descarga de fallback
 * @returns {boolean} true si se completó alguna acción, false si el usuario canceló
 */
function manejarDescarga(descarga, existeEnCarpeta, getFallback) {
  const nombre = descarga.name;

  if (descarga.disponible()) {
    // ── Caso 1: disponible + ya existe → preguntar si reemplazar
    if (existeEnCarpeta) {
      const choice = Browser.msgBox(
        "Archivo existente",
        `'${nombre}' ya está en el directorio. ¿Desea reemplazarlo?`,
        Browser.Buttons.YES_NO
      );
      if (choice === "no") return false;
      descarga.folder.getFilesByName(nombre).next().setTrashed(true);
    }
    // ── Caso 2: disponible + no existe → descargar directamente
    descarga.download();
    return true;
  }

  // ── Casos 3 y 4: no disponible → ofrecer fallback
  const msgFallback = existeEnCarpeta
    ? `'${nombre}' aún no está publicado por el DANE.\n¿Descargar la versión anterior?`
    : `'${nombre}' aún no está publicado.\n¿Descargar la última versión disponible?`;

  const choice = Browser.msgBox("Archivo no disponible", msgFallback, Browser.Buttons.YES_NO);
  if (choice === "no") return false;

  const fallback = getFallback();
  if (!fallback.disponible()) {
    Browser.msgBox("Error", `No se encontró ninguna versión disponible de '${nombre}'.`, Browser.Buttons.OK);
    return false;
  }

  if (existeEnCarpeta) {
    descarga.folder.getFilesByName(nombre).next().setTrashed(true);
  }
  fallback.download();
  return true;
}

// ─── FUNCIÓN PRINCIPAL ─────────────────────────────────

function descargarArchivos() {
  const fecha = new Date();

  // 1. Obtener carpeta del spreadsheet y listar archivos existentes
  const folder = DriveApp.getFilesByName(SpreadsheetApp.getActiveSpreadsheet().getName())
    .next().getParents().next();

  const archivosExistentes = new Set();
  let iter = folder.getFiles();
  while (iter.hasNext()) {
    archivosExistentes.add(iter.next().getName());
  }
  archivosExistentes.delete(NOMBRE_SPREADSHEET);

  // 2. Registrar URLs calculadas para depuración
  Logger.log("URL empleo y desempleo: %s", urlEmpleoYDesempleo(fecha));
  Logger.log("URL informalidad:       %s", urlTrimestreMovil("anex-GEIHEISS-", fecha));
  Logger.log("URL mercado según sexo: %s", urlTrimestreMovil("anex-GEIHMLS-",  fecha));
  Logger.log("URL mercado juventud:   %s", urlTrimestreMovil("anex-GEIHMLJ-",  fecha));

  // 3. Configuración de los cuatro archivos a descargar
  const configDescargas = [
    {
      nombre:       "Empleo y desempleo.xlsx",
      getDescarga:  () => new Descarga(urlEmpleoYDesempleo(fecha),                "Empleo y desempleo.xlsx",                folder),
      getFallback:  () => new Descarga(urlEmpleoYDesempleo(fecha, 1),             "Empleo y desempleo.xlsx",                folder)
    },
    {
      nombre:       "Empleo informal y seguridad social.xlsx",
      getDescarga:  () => new Descarga(urlTrimestreMovil("anex-GEIHEISS-", fecha),   "Empleo informal y seguridad social.xlsx", folder),
      getFallback:  () => new Descarga(urlTrimestreMovil("anex-GEIHEISS-", fecha, 1),"Empleo informal y seguridad social.xlsx", folder)
    },
    {
      nombre:       "Mercado laboral según sexo.xlsx",
      getDescarga:  () => new Descarga(urlTrimestreMovil("anex-GEIHMLS-",  fecha),   "Mercado laboral según sexo.xlsx",         folder),
      getFallback:  () => new Descarga(urlTrimestreMovil("anex-GEIHMLS-",  fecha, 1),"Mercado laboral según sexo.xlsx",         folder)
    },
    {
      nombre:       "Mercado laboral de la juventud.xlsx",
      getDescarga:  () => new Descarga(urlTrimestreMovil("anex-GEIHMLJ-",  fecha),   "Mercado laboral de la juventud.xlsx",     folder),
      getFallback:  () => new Descarga(urlTrimestreMovil("anex-GEIHMLJ-",  fecha, 1),"Mercado laboral de la juventud.xlsx",     folder)
    }
  ];

  // 4. Ejecutar descargas
  for (const item of configDescargas) {
    manejarDescarga(item.getDescarga(), archivosExistentes.has(item.nombre), item.getFallback);
  }

  // 5. Re-leer la carpeta para incluir los archivos recién descargados
  const archivosXlsx = [];
  iter = folder.getFiles();
  while (iter.hasNext()) {
    const file = iter.next();
    if (/\.xlsx$/i.test(file.getName())) {
      archivosXlsx.push(file);    // guardamos el objeto File directamente
    }
  }

  if (archivosXlsx.length === 0) {
    Browser.msgBox("No se encontraron archivos .xlsx para convertir.");
    return;
  }

  // 6. Convertir Excel → Google Sheets (eliminar versión anterior si existe)
  const convertidos = [];
  for (const excelFile of archivosXlsx) {
    const nombre       = excelFile.getName();
    const nombreSinExt = nombre.replace(/\.xlsx$/i, "");

    // Eliminar hoja existente para evitar duplicados
    const existeGSheets = folder.getFilesByName(nombreSinExt);
    if (existeGSheets.hasNext()) {
      existeGSheets.next().setTrashed(true);
      Logger.log("Google Sheets anterior eliminada: %s", nombreSinExt);
    }

    const configApi = {
      name:     nombreSinExt,
      mimeType: MimeType.GOOGLE_SHEETS,
      parents:  [folder.getId()]
    };

    try {
      const hojaCreada = Drive.Files.create(configApi, excelFile.getBlob(), { fields: "id, name, webViewLink" });
      convertidos.push(nombreSinExt);
      Logger.log("Convertido: %s → %s", nombre, hojaCreada.webViewLink);
    } catch (e) {
      Browser.msgBox(`Error al convertir '${nombre}':\n${e.toString()}`);
      Logger.log("Error convirtiendo %s: %s", nombre, e.toString());
    }
  }

  // 7. Eliminar archivos .xlsx originales
  for (const excelFile of archivosXlsx) {
    excelFile.setTrashed(true);
    Logger.log("Excel eliminado: %s", excelFile.getName());
  }

  Browser.msgBox(
    "✅ Proceso completado",
    `Archivos convertidos a Google Sheets:\n• ${convertidos.join("\n• ")}`,
    Browser.Buttons.OK
  );
}