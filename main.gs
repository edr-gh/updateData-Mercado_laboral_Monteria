function addYear(){
      
  let year
  let esValido = false

  while(!esValido){

    year = Browser.inputBox("Año","Digite el año de los datos",Browser.Buttons.OK_CANCEL)

    if(year === "cancel"){
      return;
    }
    if(/^\d{4}$/g.test(year)){
      esValido = true
    }
    else{
      Browser.msgBox("Dato inválido","El dato ingresado no es un valor válido como año",Browser.Buttons.OK)
    }
  }
}


function updateMonteria() {
  
  // Declarar el libro destino

    let libroDestino = SpreadsheetApp.getActiveSpreadsheet()

  // Obtener el libro de datos

    let libroEmpleoYDesempleo = SpreadsheetApp.open(DriveApp.getFilesByName("Empleo y desempleo").next())

  // Declarar el año al que corresponden los datos
  
    year = addYear()

  // Declaramos las hojas destino en el libro destino

    let hojaMonteria = libroDestino.getSheetByName("Monteria")
    let hojaParesRegionales = libroDestino.getSheetByName("TD pares regionales")
    let hojaParesEconomicos = libroDestino.getSheetByName("TD pares economicos")
    let hojaDistrinucionPFFT = libroDestino.getSheetByName("Distribucion PFFT")
    let hojaOcupadosPorRamas = libroDestino.getSheetByName("Ocupados Monteria por ramas")

  // Insertamos el año en las hojas destino

    hojaMonteria.getRange(hojaMonteria.getLastRow()+1,1).setValue(year)
    hojaParesRegionales.getRange(hojaParesRegionales.getLastRow()+1,1).setValue(year)
    hojaParesEconomicos.getRange(hojaParesEconomicos.getLastRow()+1,1).setValue(year)
    hojaDistrinucionPFFT.getRange(hojaDistrinucionPFFT.getLastRow()+1,1).setValue(year)
    hojaOcupadosPorRamas.getRange(hojaOcupadosPorRamas.getLastRow()+1,1).setValue(year)

  // Insertamos el trimestre correspondiente a los datos en las hojas correspondientes

    let hojaDatosMonteria = libroEmpleoYDesempleo.getSheetByName("Total 23 ciudades A.M. Trim")
    let trim = hojaDatosMonteria.getRange(222,hojaDatosMonteria.getLastColumn()).getValue().toString().replace(/\d+/g,"").replace(/\s/g,"")
    
    hojaMonteria.getRange(hojaMonteria.getLastRow(),2).setValue(trim)
    hojaParesRegionales.getRange(hojaMonteria.getLastRow(),2).setValue(trim)
    hojaParesEconomicos.getRange(hojaMonteria.getLastRow(),2).setValue(trim)
    hojaDistrinucionPFFT.getRange(hojaDistrinucionPFFT.getLastRow(),2).setValue(trim)
    hojaOcupadosPorRamas.getRange(hojaOcupadosPorRamas.getLastRow(),2).setValue(trim)

  // Obtenemos y colocamos los datos en la hoja "Monteria" del libro destino

    let datosMonteria1 = hojaDatosMonteria.getRange(223,hojaDatosMonteria.getLastColumn(),5,1).getValues()
    let datosMonteria2 = hojaDatosMonteria.getRange(229,hojaDatosMonteria.getLastColumn(),8,1).getValues()

    let datosTranspuestosMonteria1 = datosMonteria1[0].map((_,column)=>datosMonteria1.map(row=>row[column]))
    let datosTranspuestosMonteria2 = datosMonteria2[0].map((_,column)=>datosMonteria2.map(row=>row[column]))

    
    hojaMonteria.getRange(hojaMonteria.getLastRow(),3,1,5).setValues(datosTranspuestosMonteria1)
    hojaMonteria.getRange(hojaMonteria.getLastRow(),8,1,8).setValues(datosTranspuestosMonteria2)

  // Obtenemos y colocamos los datos en la hoja "TD pares regionales" del libro destino
    
    let filasTDParesRegionales = [226,397,340,416,93,245,454]
    let datosTDParesRegionales = [[]]

    for(let i =0;i<filasTDParesRegionales.length;i++){
      let tdParesRegionales = hojaDatosMonteria.getRange(filasTDParesRegionales[i],hojaDatosMonteria.getLastColumn()).getValue()
      datosTDParesRegionales[0].push(tdParesRegionales)
    }
    
    hojaParesRegionales.getRange(hojaParesRegionales.getLastRow(),3,1,7).setValues(datosTDParesRegionales)    

  // Obtenemos y colocamos los datos en la hoja "TD pares economicos" del libro destino

    let filasTDParesEconomicos = [226,378,416,150,340,321,435]
    let datosTDParesEconomicos = [[]]
    
    for(let i =0; i<filasTDParesEconomicos.length; i++){
      let tdParesEconomicos = hojaDatosMonteria.getRange(filasTDParesEconomicos[i],hojaDatosMonteria.getLastColumn()).getValue()  
      datosTDParesEconomicos[0].push(tdParesEconomicos)
    }

    hojaParesEconomicos.getRange(hojaParesEconomicos.getLastRow(),3,1,7).setValues(datosTDParesEconomicos)

  // Obtenemos y colocamos los datos en la hoja "Distribucion PFFT" del libro destino

    let hojaDatosPFFT = libroEmpleoYDesempleo.getSheetByName("Pob_fuera_fuerza_trab_T13ciud")

    let datosPFFT = hojaDatosPFFT.getRange(77,hojaDatosPFFT.getLastColumn(),3,1).getValues()

    let datosTranspuestosPFFT = datosPFFT[0].map((_,column)=>datosPFFT.map(row=>row[column]))

    hojaDistrinucionPFFT.getRange(hojaDistrinucionPFFT.getLastRow(),3,1,3).setValues(datosTranspuestosPFFT)

  // Obtenemos y colocamos los datos en la hoja "Ocupados Monteria por ramas"

    let hojaDatosOcupadosPorRamas = libroEmpleoYDesempleo.getSheetByName("Ocupados 23 Ciudades_rama_Trim")

    let datosOcupadosRamas = hojaDatosOcupadosPorRamas.getRange(147,hojaDatosOcupadosPorRamas.getLastColumn(),16,1).getValues()

    let datosTranspuestosOcupadosRamas = datosOcupadosRamas[0].map((_,column)=>datosOcupadosRamas.map(row=>row[column]))

    hojaOcupadosPorRamas.getRange(hojaOcupadosPorRamas.getLastRow(),3,1,16).setValues(datosTranspuestosOcupadosRamas)

  // Finalmente, cambiamos el rango nombrado para cada hoja del libro destino

    hojaMonteria.getNamedRanges()[0].setRange(
      hojaMonteria.getRange(1,1,hojaMonteria.getLastRow(),hojaMonteria.getLastColumn())
      )
    hojaParesRegionales.getNamedRanges()[0].setRange(
      hojaParesRegionales.getRange(1,1,hojaParesRegionales.getLastRow(),hojaParesRegionales.getLastColumn())
      )
    hojaParesEconomicos.getNamedRanges()[0].setRange(
      hojaParesEconomicos.getRange(1,1,hojaParesEconomicos.getLastRow(),hojaParesEconomicos.getLastColumn())
      )
    hojaDistrinucionPFFT.getNamedRanges()[0].setRange(
      hojaDistrinucionPFFT.getRange(1,1,hojaDistrinucionPFFT.getLastRow(),hojaDistrinucionPFFT.getLastColumn())
      )
    hojaOcupadosPorRamas.getNamedRanges()[0].setRange(
      hojaOcupadosPorRamas.getRange(1,1,hojaOcupadosPorRamas.getLastRow(),hojaOcupadosPorRamas.getLastColumn())
    )
}

function updateInformalidad(){

  // Declarando los libros y hojas de datos y destino
    let libroDestino = SpreadsheetApp.getActiveSpreadsheet()
    let libroEmpleoInformalYSeguridadSocial = SpreadsheetApp.open(DriveApp.getFilesByName("Empleo informal y seguridad social").next())
    
    let hojaFormalesEInformales = libroDestino.getSheetByName("Formales e informales Monteria")
    let hojaDatosFormalesEInformales = libroEmpleoInformalYSeguridadSocial.getSheetByName("Ciudades")
    
    let hojaInformalidadMonteria = libroDestino.getSheetByName("Proporcion de Informalidad")
    let hojaDatosInformalidad = libroEmpleoInformalYSeguridadSocial.getSheetByName("Prop informalidad")
  
  // Obtener el año en la hoja destino

    year = addYear()

    hojaFormalesEInformales.getRange(hojaFormalesEInformales.getLastRow()+1,1).setValue(year)
    hojaInformalidadMonteria.getRange(hojaInformalidadMonteria.getLastRow()+1,1).setValue(year)

  // Obtener y colocar el trimestre de los datos en la hoja y libro destino
    let trim = hojaDatosFormalesEInformales.getRange(12,hojaDatosFormalesEInformales.getLastColumn())
      .getValue().toString().replace(/\d+/g,"").replace(/\s+/g,"").replace(/\w+/g,(match)=>match.charAt(0).toUpperCase()+match.slice(1))

    hojaFormalesEInformales.getRange(hojaFormalesEInformales.getLastRow(),2).setValue(trim)
    hojaInformalidadMonteria.getRange(hojaInformalidadMonteria.getLastRow(),2).setValue(trim)
  
  // Obtener y colocar datos en la hoja "Formales e informales Monteria" del libro destino
    let datosFormalesEInformales = hojaDatosFormalesEInformales.getRange(46,hojaDatosFormalesEInformales.getLastColumn(),3,1).getValues()  
    let datosTranspuestosFormalesEInformales = datosFormalesEInformales[0].map((_,column)=>datosFormalesEInformales.map(row=>row[column]))

    hojaFormalesEInformales.getRange(hojaFormalesEInformales.getLastRow(),3,1,3).setValues(datosTranspuestosFormalesEInformales)

  // Obtener y colocar datos en la hoja "Proporcion de Informalidad" del libro destino
    let datosInformalidad = hojaDatosInformalidad.getRange(13,hojaDatosInformalidad.getLastColumn(),26,1).getValues()

    let datosTranpuestosInformalidad = datosInformalidad[0].map((_,column)=>datosInformalidad.map(row=>row[column]))

    hojaInformalidadMonteria.getRange(hojaInformalidadMonteria.getLastRow(),3,1,26).setValues(datosTranpuestosInformalidad)
  
  // Finalmente, cambiamos el rango nombrado para cada hoja en el libro destino
      hojaFormalesEInformales.getNamedRanges()[0].setRange(
        hojaFormalesEInformales.getRange(1,1,hojaFormalesEInformales.getLastRow(),hojaFormalesEInformales.getLastColumn())
        )
      hojaInformalidadMonteria.getNamedRanges()[0].setRange(
        hojaInformalidadMonteria.getRange(1,1,hojaInformalidadMonteria.getLastRow(),hojaInformalidadMonteria.getLastColumn())
      )
}

function updateMonteriaJoven(){

  // Declaramos el libro y las hojas destino y de datos

    let libroDestino = SpreadsheetApp.getActiveSpreadsheet()
    let libroDatosMonteriaJoven = SpreadsheetApp.open(DriveApp.getFilesByName("Mercado laboral de la juventud").next())

    let hojaMonteriaJoven = libroDestino.getSheetByName("Monteria Joven")
    let hojaDatosMonteriaJoven = libroDatosMonteriaJoven.getSheetByName("23 ciudades trim móvil")

  // Obtenemos el dato del año 

    year = addYear()

    hojaMonteriaJoven.getRange(hojaMonteriaJoven.getLastRow()+1,1).setValue(year)  

  // Obtenemos el trimestre de los datos

    let trim = hojaDatosMonteriaJoven.getRange(202,hojaDatosMonteriaJoven.getLastColumn())
      .getValue().toString().replace(/\d+/g,"").replace(/\s+/g,"")

    hojaMonteriaJoven.getRange(hojaMonteriaJoven.getLastRow(),2).setValue(trim)


  // Obtenemos y colocamos los datos en el libro destino

    let datosMonteriaJoven = hojaDatosMonteriaJoven.getRange(203,hojaDatosMonteriaJoven.getLastColumn(),11,1).getValues()
    let datosTranspuestosMonteriaJoven = datosMonteriaJoven[0].map((_,column)=>datosMonteriaJoven.map(row=>row[column]))

    hojaMonteriaJoven.getRange(hojaMonteriaJoven.getLastRow(),3,1,11).setValues(datosTranspuestosMonteriaJoven)

  // Finalmente, cambiamos el rango nombrado en la hoja destino
    hojaMonteriaJoven.getNamedRanges()[0].setRange(
      hojaMonteriaJoven.getRange(1,1,hojaMonteriaJoven.getLastRow(),hojaMonteriaJoven.getLastColumn())
    )
}

function updateMonteriaSexo(){
  
  // Declarando los libros y hojas de datos y destino

    let libroDestino = SpreadsheetApp.getActiveSpreadsheet()
    let libroMonteriaSexo = SpreadsheetApp.open(DriveApp.getFilesByName("Mercado laboral según sexo").next())

    let hojaMonteriaSexo = libroDestino.getSheetByName("Monteria por sexo")
    let hojaDatosMonteriaHombres = libroMonteriaSexo.getSheetByName("Hombres - 23 Ciud")
    let hojaDatosMonteriaMujeres = libroMonteriaSexo.getSheetByName("Mujeres - 23 Ciud")
  
  // Obtener el año de los datos

    year = addYear()

  hojaMonteriaSexo.getRange(hojaMonteriaSexo.getLastRow()+1,1).setValue(year)

  // Obtener y colocar el trimestre de los datos

    let trim = hojaDatosMonteriaHombres.getRange(186,hojaDatosMonteriaHombres.getLastColumn())
    .getValue().toString().replace(/\d+/g,"").replace(/\s+/g,"")

    hojaMonteriaSexo.getRange(hojaMonteriaSexo.getLastRow(),2).setValue(trim)

  // Obtener los datos de "Hombres" y "Mujeres" del libro de datos y copiarlos en el libro destino

    let datosHombres1 = hojaDatosMonteriaHombres.getRange(187,hojaDatosMonteriaHombres.getLastColumn(),4,1).getValues()
    let datosHombres2 = hojaDatosMonteriaHombres.getRange(192,hojaDatosMonteriaHombres.getLastColumn(),5,1).getValues()

    let datosTranspuestosHombres1 = datosHombres1[0].map((_,column)=>datosHombres1.map(row=>row[column]))
    let datosTranspuestosHombres2 = datosHombres2[0].map((_,column)=>datosHombres2.map(row=>row[column]))

    hojaMonteriaSexo.getRange(hojaMonteriaSexo.getLastRow(),3,1,4).setValues(datosTranspuestosHombres1)
    hojaMonteriaSexo.getRange(hojaMonteriaSexo.getLastRow(),7,1,5).setValues(datosTranspuestosHombres2)

    let datosMujeres1 = hojaDatosMonteriaMujeres.getRange(187,hojaDatosMonteriaMujeres.getLastColumn(),4,1).getValues()
    let datosMujeres2 = hojaDatosMonteriaMujeres.getRange(192,hojaDatosMonteriaMujeres.getLastColumn(),5,1).getValues()
    
    let datosTranspuestosMujeres1 = datosMujeres1[0].map((_,column)=>datosMujeres1.map(row=>row[column]))
    let datosTranspuestosMujeres2 = datosMujeres2[0].map((_,column)=>datosMujeres2.map(row=>row[column]))

    hojaMonteriaSexo.getRange(hojaMonteriaSexo.getLastRow(),12,1,4).setValues(datosTranspuestosMujeres1)
    hojaMonteriaSexo.getRange(hojaMonteriaSexo.getLastRow(),16,1,5).setValues(datosTranspuestosMujeres2)

  // Finalmente, cambiamos el rango nombrado en la hoja destino
    hojaMonteriaSexo.getNamedRanges()[0].setRange(
      hojaMonteriaSexo.getRange(1,1,hojaMonteriaSexo.getLastRow(),hojaMonteriaSexo.getLastColumn())
    )
}

function menuActualizarDatos(){

  let ui = SpreadsheetApp.getUi()

  let menu = ui.createMenu("updateData")

  menu.addItem("Actualizar datos de Montería, pares regionales y economicos","updateMonteria")
    .addItem("Actualizar datos sobre informalidad","updateInformalidad")
    .addItem("Actualizar datos sobre Mercado laboral de la Juventud","updateMonteriaJoven")
    .addItem("Actualizar datos sobre Mercado laboral según sexo","updateMonteriaSexo")
    .addItem("Descargar archivos","descargarArchivos")
    .addToUi()
}


function onOpen(){

  menuActualizarDatos()

}