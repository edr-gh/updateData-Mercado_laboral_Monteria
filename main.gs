// =====================================================
// main.gs — FUNCIONES DE ACTUALIZACIÓN + MENÚ
// =====================================================
//
// Cada función updateXxx orquesta el flujo:
//   1. Leer períodos disponibles en el anexo del DANE
//   2. Detectar cuáles faltan en la hoja destino
//   3. Pedir confirmación al usuario
//   4. Leer y escribir en lote
//
// ─── FUNCIONES DE ACTUALIZACIÓN ───────────────────────────────────────────────────────

function updateMonteria() {
  const libroDestino          = SpreadsheetApp.getActiveSpreadsheet();
  const libroEmpleoYDesempleo = abrirLibro("Empleo y desempleo");

  // Hojas fuente
  const srcPrincipal = libroEmpleoYDesempleo.getSheetByName("Total 23 ciudades A.M. Trim");
  const srcPFFT      = libroEmpleoYDesempleo.getSheetByName("Pob_fuera_fuerza_trab_T13ciud");
  const srcRamas     = libroEmpleoYDesempleo.getSheetByName("Ocupados 23 Ciudades_rama_Trim");

  // Hojas destino
  const dstMonteria = libroDestino.getSheetByName("Monteria");
  const dstParesReg = libroDestino.getSheetByName("TD pares regionales");
  const dstParesEco = libroDestino.getSheetByName("TD pares economicos");
  const dstPFFT     = libroDestino.getSheetByName("Distribucion PFFT");
  const dstRamas    = libroDestino.getSheetByName("Ocupados Monteria por ramas");

  // Detectar períodos faltantes
  const { yearRow: yrM, monthRow: moM } = SHEET_CONFIG.EMPLEO_DESEMPLEO;
  const periodosDisponibles = buildPeriodList(srcPrincipal, yrM, moM);
  const periodosRegistrados = getRegisteredPeriods(dstMonteria);
  const periodosFaltantes   = findMissingPeriods(periodosDisponibles, periodosRegistrados);
  if (!confirmarPeriodos(periodosFaltantes, "Montería")) return;

  const N           = periodosFaltantes.length;
  const missingCols = periodosFaltantes.map(p => p.col);

  // Preparar hojas secundarias (cada una tiene su propio mapa de columnas)
  const { yearRow: yrP, monthRow: moP } = SHEET_CONFIG.PFFT;
  const { yearRow: yrR, monthRow: moR } = SHEET_CONFIG.RAMAS;
  const pfftInfo  = prepararHojaSecundaria(srcPFFT,  yrP, moP,  77,  3, periodosFaltantes);
  const ramasInfo = prepararHojaSecundaria(srcRamas, yrR, moR, 147, 16, periodosFaltantes);

  // ── Lectura en lote desde hoja principal
  const rawB1       = leerBloqueYColumnas(srcPrincipal, 223, 5, missingCols);  // [5 × N]
  const rawB2       = leerBloqueYColumnas(srcPrincipal, 229, 8, missingCols);  // [8 × N]
  const rawParesReg = leerFilasYColumnas(srcPrincipal, FILAS_PARES_REGIONALES, missingCols); // [7 × N]
  const rawParesEco = leerFilasYColumnas(srcPrincipal, FILAS_PARES_ECONOMICOS, missingCols); // [7 × N]

  // ── Capturar filas destino ANTES de cualquier escritura
  const sr = {
    monteria: dstMonteria.getLastRow() + 1,
    paresReg: dstParesReg.getLastRow() + 1,
    paresEco: dstParesEco.getLastRow() + 1,
    pfft:     dstPFFT.getLastRow() + 1,
    ramas:    dstRamas.getLastRow() + 1,
  };

  // ── Escritura en lote (una llamada a setValues() por bloque)
  const yearTrimData = periodosFaltantes.map(p => [p.year, p.trim]);

  dstMonteria.getRange(sr.monteria, 1, N, 2).setValues(yearTrimData);
  dstParesReg.getRange(sr.paresReg, 1, N, 2).setValues(yearTrimData);
  dstParesEco.getRange(sr.paresEco, 1, N, 2).setValues(yearTrimData);
  dstPFFT    .getRange(sr.pfft,     1, N, 2).setValues(yearTrimData);
  dstRamas   .getRange(sr.ramas,    1, N, 2).setValues(yearTrimData);

  dstMonteria.getRange(sr.monteria, 3, N, 5).setValues(
    periodosFaltantes.map((_, i) => rawB1.map(r => r[i]))
  );
  dstMonteria.getRange(sr.monteria, 8, N, 8).setValues(
    periodosFaltantes.map((_, i) => rawB2.map(r => r[i]))
  );
  dstParesReg.getRange(sr.paresReg, 3, N, 7).setValues(
    periodosFaltantes.map((_, i) => rawParesReg.map(r => r[i]))
  );
  dstParesEco.getRange(sr.paresEco, 3, N, 7).setValues(
    periodosFaltantes.map((_, i) => rawParesEco.map(r => r[i]))
  );
  dstPFFT.getRange(sr.pfft,   3, N,  3).setValues(
    buildWriteMatrix(periodosFaltantes,
      pfftInfo.colsForPeriods,  pfftInfo.rawData,  pfftInfo.colToOffset,   3)
  );
  dstRamas.getRange(sr.ramas, 3, N, 16).setValues(
    buildWriteMatrix(periodosFaltantes,
      ramasInfo.colsForPeriods, ramasInfo.rawData, ramasInfo.colToOffset, 16)
  );

  [dstMonteria, dstParesReg, dstParesEco, dstPFFT, dstRamas].forEach(actualizarRangoNombrado);
  SpreadsheetApp.flush();
  Browser.msgBox(`✅ ${N} período(s) actualizados correctamente en Montería.`);
}


function updateInformalidad() {
  const libroDestino = SpreadsheetApp.getActiveSpreadsheet();
  const libroInform  = abrirLibro("Empleo informal y seguridad social");

  const srcCiudades   = libroInform.getSheetByName("Ciudades");
  const srcPropInform = libroInform.getSheetByName("Prop informalidad");

  const dstFormales     = libroDestino.getSheetByName("Formales e informales Monteria");
  const dstInformalidad = libroDestino.getSheetByName("Proporcion de Informalidad");

  const { yearRow, monthRow } = SHEET_CONFIG.INFORMALIDAD;
  const periodosDisponibles = buildPeriodList(srcCiudades, yearRow, monthRow);
  const periodosRegistrados = getRegisteredPeriods(dstFormales);
  const periodosFaltantes   = findMissingPeriods(periodosDisponibles, periodosRegistrados);
  if (!confirmarPeriodos(periodosFaltantes, "Informalidad")) return;

  const N           = periodosFaltantes.length;
  const missingCols = periodosFaltantes.map(p => p.col);

  const { yearRow: yrProp, monthRow: moProp } = SHEET_CONFIG.INFORMALIDAD_PROP;
  const propInfo = prepararHojaSecundaria(
    srcPropInform, yrProp, moProp, 13, 26, periodosFaltantes
  );

  const rawFormales = leerBloqueYColumnas(srcCiudades, 46, 3, missingCols);  // [3 × N]

  const srFormales     = dstFormales.getLastRow() + 1;
  const srInformalidad = dstInformalidad.getLastRow() + 1;

  const yearTrimData = periodosFaltantes.map(p => [p.year, p.trim]);
  dstFormales    .getRange(srFormales,     1, N, 2).setValues(yearTrimData);
  dstInformalidad.getRange(srInformalidad, 1, N, 2).setValues(yearTrimData);

  dstFormales.getRange(srFormales, 3, N, 3).setValues(
    periodosFaltantes.map((_, i) => rawFormales.map(r => r[i]))
  );
  dstInformalidad.getRange(srInformalidad, 3, N, 26).setValues(
    buildWriteMatrix(periodosFaltantes,
      propInfo.colsForPeriods, propInfo.rawData, propInfo.colToOffset, 26)
  );

  [dstFormales, dstInformalidad].forEach(actualizarRangoNombrado);
  SpreadsheetApp.flush();
  Browser.msgBox(`✅ ${N} período(s) de informalidad actualizados correctamente.`);
}


function updateMonteriaJoven() {
  const libroDestino = SpreadsheetApp.getActiveSpreadsheet();
  const libroJoven   = abrirLibro("Mercado laboral de la juventud");

  const srcJoven = libroJoven.getSheetByName("23 ciudades trim móvil");
  const dstJoven = libroDestino.getSheetByName("Monteria Joven");

  // GEIHMLJ incluye el año en cada celda de mes ('Ene - Mar 26')
  // → parsePeriodHeader lo extrae directamente de los 2 dígitos
  const { yearRow, monthRow } = SHEET_CONFIG.JUVENTUD;
  const periodosDisponibles = buildPeriodList(srcJoven, yearRow, monthRow);
  const periodosRegistrados = getRegisteredPeriods(dstJoven);
  const periodosFaltantes   = findMissingPeriods(periodosDisponibles, periodosRegistrados);
  if (!confirmarPeriodos(periodosFaltantes, "Mercado laboral juvenil")) return;

  const N           = periodosFaltantes.length;
  const missingCols = periodosFaltantes.map(p => p.col);

  const rawJoven = leerBloqueYColumnas(srcJoven, 203, 11, missingCols);  // [11 × N]

  const srJoven = dstJoven.getLastRow() + 1;

  dstJoven.getRange(srJoven, 1, N,  2).setValues(periodosFaltantes.map(p => [p.year, p.trim]));
  dstJoven.getRange(srJoven, 3, N, 11).setValues(
    periodosFaltantes.map((_, i) => rawJoven.map(r => r[i]))
  );

  actualizarRangoNombrado(dstJoven);
  SpreadsheetApp.flush();
  Browser.msgBox(`✅ ${N} período(s) del mercado laboral juvenil actualizados correctamente.`);
}


function updateMonteriaSexo() {
  const libroDestino = SpreadsheetApp.getActiveSpreadsheet();
  const libroSexo    = abrirLibro("Mercado laboral según sexo");

  const srcHombres = libroSexo.getSheetByName("Hombres - 23 Ciud");
  const srcMujeres = libroSexo.getSheetByName("Mujeres - 23 Ciud");
  const dstSexo    = libroDestino.getSheetByName("Monteria por sexo");

  // Hombres como fuente primaria; mujeres tiene su propio mapa (misma estructura, mismas columnas)
  const { yearRow, monthRow } = SHEET_CONFIG.SEXO;
  const periodosDisponibles = buildPeriodList(srcHombres, yearRow, monthRow);
  const periodosRegistrados = getRegisteredPeriods(dstSexo);
  const periodosFaltantes   = findMissingPeriods(periodosDisponibles, periodosRegistrados);
  if (!confirmarPeriodos(periodosFaltantes, "Mercado laboral por sexo")) return;

  const N           = periodosFaltantes.length;
  const missingCols = periodosFaltantes.map(p => p.col);

  // Mujeres: resolver columnas desde su propio encabezado
  const mapMujeres     = buildPeriodMap(srcMujeres, yearRow, monthRow);
  const mujeresCols    = periodosFaltantes.map(p => mapMujeres[p.key] || null);
  const uniqueColsMuj  = [...new Set(mujeresCols.filter(Boolean))].sort((a, b) => a - b);
  const mujColToOffset = Object.fromEntries(uniqueColsMuj.map((col, i) => [col, i]));

  // Lectura en lote
  const rawH1 = leerBloqueYColumnas(srcHombres, 187, 4, missingCols);  // % PET, TGP, TO, TD  [4 × N]
  const rawH2 = leerBloqueYColumnas(srcHombres, 192, 5, missingCols);  // Pob total…PD         [5 × N]
  const rawM1 = uniqueColsMuj.length > 0
    ? leerBloqueYColumnas(srcMujeres, 187, 4, uniqueColsMuj) : [];
  const rawM2 = uniqueColsMuj.length > 0
    ? leerBloqueYColumnas(srcMujeres, 192, 5, uniqueColsMuj) : [];

  const buildMujMatrix = (raw, nc) => periodosFaltantes.map((p, i) => {
    const col = mujeresCols[i];
    if (!col) { Logger.log("ADVERTENCIA: período %s no en hoja Mujeres.", p.key);
                return new Array(nc).fill(""); }
    return raw.map(r => r[mujColToOffset[col]]);
  });

  const srSexo = dstSexo.getLastRow() + 1;

  dstSexo.getRange(srSexo,  1, N,  2).setValues(periodosFaltantes.map(p => [p.year, p.trim]));
  dstSexo.getRange(srSexo,  3, N,  4).setValues(periodosFaltantes.map((_, i) => rawH1.map(r => r[i])));
  dstSexo.getRange(srSexo,  7, N,  5).setValues(periodosFaltantes.map((_, i) => rawH2.map(r => r[i])));
  dstSexo.getRange(srSexo, 12, N,  4).setValues(buildMujMatrix(rawM1, 4));
  dstSexo.getRange(srSexo, 16, N,  5).setValues(buildMujMatrix(rawM2, 5));

  actualizarRangoNombrado(dstSexo);
  SpreadsheetApp.flush();
  Browser.msgBox(`✅ ${N} período(s) del mercado laboral por sexo actualizados correctamente.`);
}

// ─── MENÚ ─────────────────────────────────────────────────────────────────────────────

function menuActualizarDatos() {
  SpreadsheetApp.getUi()
    .createMenu("📊 Actualizar Datos")
    .addItem("Montería, pares regionales y económicos", "updateMonteria")
    .addItem("Empleo informal y seguridad social",      "updateInformalidad")
    .addItem("Mercado laboral de la juventud",          "updateMonteriaJoven")
    .addItem("Mercado laboral según sexo",              "updateMonteriaSexo")
    .addSeparator()
    .addItem("📋 Crear hojas con la disposición",       "crearHojasDisposicion")
    .addItem("⬇️  Descargar archivos del DANE",         "descargarArchivos")
    .addToUi();
}

function onOpen() {
  menuActualizarDatos();
}
