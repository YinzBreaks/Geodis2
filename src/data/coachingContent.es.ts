import { WorkflowStep } from "@/types/domain"
import type { CoachingContent } from "@/types/coaching"

// Spanish localization for all beginner coaching steps.
export const COACHING_CONTENT_ES: Partial<Record<WorkflowStep, CoachingContent>> = {
  [WorkflowStep.BC_TRAVEL_TO_COMMAND_CENTER]: {
    action: "Dirijase al Command Center para recibir instrucciones del Tasker/CSR",
    sopContext:
      "§5.1.1 — El inicio del turno comienza en Command Center para recibir asignacion de zona y cantidad de totes.",
    fieldDef:
      "Command Center = punto de coordinacion del supervisor para asignar trabajo.",
  },
  [WorkflowStep.BC_RECEIVE_TOTE_COUNT]: {
    action: "Confirme con el Tasker cuantas totes debe cargar en el carrito",
    sopContext:
      "§5.1.2 — Debe usar la cantidad correcta de totes para evitar errores de escaneo.",
  },
  [WorkflowStep.BC_OBTAIN_CART]: {
    action: "Tome un Cart disponible y preparelo para Build Cart",
    sopContext:
      "§5.1.3 — El Cart se vincula a su sesion al escanear su codigo.",
  },
  [WorkflowStep.BC_LOAD_TOTES]: {
    action: "Coloque totes vacias en los slots del Cart, una por posicion",
    sopContext:
      "§5.1.4 — Cada slot debe tener una tote para registrar correctamente el cart.",
  },
  [WorkflowStep.BC_LOGIN_RF]: {
    action: "Ingrese su User ID y presione ENTER",
    sopContext:
      "§5.1.5 — Debe iniciar sesion en RF Device antes de comenzar el flujo de picking.",
    fieldDef:
      "USER ID = identificador de empleado en GEODIS.",
  },
  [WorkflowStep.BC_SELECT_BBWD]: {
    action: "Escriba 1 y presione ENTER para seleccionar BBWD",
    sopContext:
      "§5.1.6 — BBWD es el menu operativo correcto para este flujo.",
  },
  [WorkflowStep.BC_SELECT_OUTBOUND]: {
    action: "Escriba 2 y presione ENTER para Outbound Phase II",
    sopContext:
      "§5.1.7 — Outbound Phase II activa el flujo de picking de salida.",
  },
  [WorkflowStep.BC_PRESS_CTRL_T]: {
    action: "Presione ^T para cambiar/confirmar Task Group",
    sopContext:
      "§5.1.8 — CTRL+T define el Task Group correcto para su zona.",
  },
  [WorkflowStep.BC_CONFIRM_TASK_GROUP]: {
    action: "Verifique GROUP y presione ENTER",
    sopContext:
      "§5.1.8 — Confirme que el Task Group coincide con su asignacion.",
  },
  [WorkflowStep.BC_SCAN_ZONE_TASK_GROUP]: {
    action: "Escanee el codigo de barra de su zona o FEX",
    sopContext:
      "§5.1.9 — El escaneo de zona finaliza la asignacion de Task Group.",
  },
  [WorkflowStep.BC_SELECT_MAKE_TOTE_CART]: {
    action: "Escriba 1 y ENTER para Make Tote Cart BB",
    sopContext:
      "§5.1.10 — Esta opcion crea el registro del cart en el sistema.",
  },
  [WorkflowStep.BC_SCAN_CART_BARCODE]: {
    action: "Escanee el codigo del Cart fisico",
    sopContext:
      "§5.1.11 — Esto vincula el Cart fisico a su sesion de trabajo.",
  },
  [WorkflowStep.BC_PLACE_TOTE_IN_SLOT]: {
    action: "Coloque la tote en el slot indicado y luego presione Continuar",
    sopContext:
      "§5.1.12 — Cada tote debe estar en su slot correcto antes del escaneo.",
  },
  [WorkflowStep.BC_SCAN_TOTE_BARCODE]: {
    action: "Escanee la tote del slot mostrado; repita hasta completar las 9",
    sopContext:
      "§5.1.12–13 — Debe registrar todas las totes para activar correctamente el cart.",
  },
  [WorkflowStep.BC_PRESS_CTRL_E]: {
    action: "Cart completo: presione Continuar para entrar a Pick Stage",
    sopContext:
      "§5.1.15 — CTRL+E finaliza Build Cart y activa el ciclo de picking.",
  },
  [WorkflowStep.PK_PICKUP_CART]: {
    action: "Tome el Cart y preparese para comenzar el Pick Stage",
    sopContext:
      "§5.2.1 — Con el Cart activo, verifique que las 9 totes esten seguras antes de comenzar el Round.",
    fieldDef:
      "Cart = el carro de picking que contiene las 9 totes y se mueve con usted por el almacen.",
  },
  [WorkflowStep.PK_READ_PICK_DISPLAY]: {
    action: "Lea el ALOC en la pantalla y presione Continuar",
    sopContext:
      "§5.2.5 — El RF Device muestra el siguiente Pick Front. Lea el ALOC antes de desplazarse.",
    fieldDef:
      "ALOC = direccion fisica del Pick Front en formato pasillo-bahia-nivel, por ejemplo 316-001-A1.",
  },
  [WorkflowStep.PK_TRAVEL_TO_LOCATION]: {
    action: "Mueva el Cart al Pick Front indicado y confirme al llegar",
    sopContext:
      "§5.2.6 — Debe desplazarse a la ubicacion exacta mostrada en RF Device.",
  },
  [WorkflowStep.PK_VERIFY_LOCATION]: {
    action: "Verifique que la ubicacion fisica coincide con la pantalla",
    sopContext:
      "§5.2.7 — Confirmar ubicacion evita picks en estantes incorrectos.",
  },
  [WorkflowStep.PK_VERIFY_ITEM]: {
    action: "Verifique que el articulo fisico coincide con el ITEM mostrado y presione Continuar",
    sopContext:
      "§5.2.8 — Compare la descripcion, el SKU y los ultimos cuatro digitos antes de escanear.",
    fieldDef:
      "ITEM (LAST 4) = los ultimos cuatro digitos del UPC usados para una verificacion visual rapida.",
  },
  [WorkflowStep.PK_SCAN_ITEM_UPC]: {
    action: "Escanee el UPC del articulo correcto",
    sopContext:
      "§5.2.9 — El UPC valida que esta tomando el item correcto.",
  },
  [WorkflowStep.PK_PICK_QUANTITY]: {
    action: "Tome la cantidad requerida y confirme",
    sopContext:
      "§5.2.10 — La cantidad correcta evita errores en ordenes de cliente.",
  },
  [WorkflowStep.PK_PLACE_IN_TOTE]: {
    action: "Coloque los articulos en la tote indicada y confirme",
    sopContext:
      "§5.2.11 — El item debe ir en la tote correcta segun RF Device.",
  },
  [WorkflowStep.PK_ENTER_QUANTITY]: {
    action: "Ingrese la cantidad colocada en la tote y presione ENTER",
    sopContext:
      "§5.2.12 — Esta entrada registra la cantidad real en el sistema.",
  },
  [WorkflowStep.PK_SCAN_TOTE_BARCODE]: {
    action: "Escanee el codigo de la tote usada para este pick",
    sopContext:
      "§5.2.13 — Confirma en que tote quedo registrado el item.",
  },
  [WorkflowStep.PK_END_OF_TOTE_DISPLAY]: {
    action: "Presione ^A para confirmar End Of Tote",
    sopContext:
      "§5.2.14 — End Of Tote indica que la tote esta completa. Confirme con CTRL+A antes de llevarla al Putwall.",
    fieldDef:
      "End Of Tote = mensaje del RF Device que indica que la tote alcanzo su capacidad y debe cerrarse.",
  },
  [WorkflowStep.PK_PRESS_CTRL_A]: {
    action: "Lleve la tote completa al Putwall y presione Continuar",
    sopContext:
      "§5.2.15 — Despues de CTRL+A, retire la tote completa del Cart y lleve la tote al Putwall de inmediato.",
    fieldDef:
      "Putwall = destino de conveyor que transporta totes completas hacia empaque y envio.",
  },
  [WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR]: {
    action: "Coloque la tote completa de forma estable en el Putwall y presione Continuar",
    sopContext:
      "§5.2.16 — Coloque la tote en el conveyor mas cercano y asegurese de que avance correctamente.",
    fieldDef:
      "Putwall = conveyor de salida para totes completas.",
  },
  [WorkflowStep.PS_TRASH_PICKUP]: {
    action: "Recoja cajas vacias, empaques y basura antes de continuar",
    sopContext:
      "§5.2.15 (BBWD-WI-030) — Mantenga el pasillo y el Pick Front libres de basura durante todo el proceso.",
  },
  [WorkflowStep.PS_LAST_ITEM_IN_BOX]: {
    action: "Desarme la caja vacia y coloquela en el contenedor de reciclaje",
    sopContext:
      "§5.2 (BBWD-WI-030) — No deje cajas vacias en el Pick Front ni en el piso despues de tomar el ultimo articulo.",
  },
  [WorkflowStep.PS_LAST_ITEM_ON_PALLET]: {
    action: "Notifique al Lead que la ubicacion del pallet quedo vacia",
    sopContext:
      "§5.2 (BBWD-WI-030) — El Lead o CSR debe actualizar el inventario y coordinar el reabastecimiento.",
  },
  [WorkflowStep.PS_CONTINUE_NEXT_TOTE]: {
    action: "Presione Continuar para comenzar los picks de la siguiente tote",
    sopContext:
      "§5.2.14 (BBWD-WI-030) — Continue el flujo hasta completar todas las totes del Cart.",
  },
  [WorkflowStep.PS_ROUND_COMPLETE]: {
    action: "Round completo: revise su puntuacion y los errores registrados",
    sopContext:
      "§5.2.13 (BBWD-WI-030) — Todas las totes del Round estan completas y el sistema calculo precision y velocidad.",
  },
  [WorkflowStep.EX_TOTE_ALREADY_ALLOCATED]: {
    action: "Separe esta tote, no la use y presione Continuar para intentar con otra tote",
    sopContext:
      "§6.1 — Tote already allocated indica que la tote sigue activa en otra sesion. El Lead debe resolverla.",
    fieldDef:
      "Tote already allocated = el barcode de la tote ya esta asignado en el WMS. Obtenga una tote sin usar.",
  },
  [WorkflowStep.EX_CART_ALREADY_CREATED]: {
    action: "Separe este Cart, no lo use y presione Continuar para obtener otro Cart",
    sopContext:
      "§6.2 — Pick Cart Already Created indica que el Cart sigue activo en una sesion anterior.",
    fieldDef:
      "Cart Already Created = el barcode del Cart esta vinculado a una sesion abierta en el WMS.",
  },
  [WorkflowStep.EX_INCORRECT_LOCATION]: {
    action: "Presione ^W y vuelva a verificar el Pick Front",
    sopContext:
      "§6.3 — CTRL+W cancela el paso actual para que pueda comparar nuevamente el ALOC y la etiqueta fisica.",
    fieldDef:
      "Incorrect Location = la ubicacion fisica no coincide con el ALOC mostrado en el RF Device.",
    highlightLine: 2,
  },
  [WorkflowStep.EX_INCORRECT_TOTE]: {
    action: "Presione ^W y luego escanee la tote correcta",
    sopContext:
      "§6.4 — Compare el Tote ID del RF Device con el barcode de la tote antes de volver a escanear.",
    fieldDef:
      "Incorrect Tote = el barcode escaneado no corresponde a la tote solicitada para este Pick.",
    highlightLine: 2,
  },
  [WorkflowStep.EX_INVALID_ITEM_LAST]: {
    action: "Notifique al Lead, presione ^K, lleve la tote al Putwall y el articulo al Amnesty Bin",
    sopContext:
      "§6.5.1 — Si el articulo invalido es el ultimo en la ubicacion, notifique antes de usar CTRL+K.",
    fieldDef:
      "Invalid Item (last) = el producto es incorrecto y no quedan mas articulos disponibles en ese Pick Front.",
    highlightLine: 1,
  },
  [WorkflowStep.EX_INVALID_ITEM_NOT_LAST]: {
    action: "Notifique al Lead, lleve la tote al Putwall y entregue el articulo incorrecto a IC",
    sopContext:
      "§6.5.2 — Si quedan mas articulos, notifique al Lead y lleve el articulo incorrecto a Inventory Control.",
    fieldDef:
      "IC = Inventory Control, el departamento que investiga y corrige discrepancias de inventario.",
    highlightLine: 1,
  },
  [WorkflowStep.EX_SHORT_INVENTORY]: {
    action: "Verifique nuevamente el Pick Front y presione Continuar para notificar al Lead",
    sopContext:
      "§6.6 — Short Inventory significa que el sistema espera un articulo que no esta fisicamente en la ubicacion.",
    fieldDef:
      "Short Inventory = falta inventario fisico que aparece disponible en el WMS.",
    highlightLine: 1,
  },
  [WorkflowStep.EX_DAMAGED_ITEM]: {
    action: "Lleve el articulo danado al Amnesty Bin; use una bolsa ziplock si tiene fuga",
    sopContext:
      "§6.7 — Los articulos danados no pueden enviarse. Aislelos para evitar contaminar otro inventario.",
    fieldDef:
      "Amnesty Bin = contenedor designado para articulos danados, incorrectos o que no se pueden escanear.",
    highlightLine: 1,
  },
  [WorkflowStep.EX_PRESS_CTRL_W]: {
    action: "Presione ^W para volver a la pantalla anterior",
    sopContext:
      "§6.3 — CTRL+W permite corregir una ubicacion o tote incorrecta sin avanzar el Pick.",
    fieldDef:
      "CTRL+W = tecla para volver y corregir el paso anterior en el RF Device.",
    highlightLine: 2,
  },
  [WorkflowStep.EX_PRESS_CTRL_K]: {
    action: "Presione ^K para saltar este Pick",
    sopContext:
      "§6.5.1 / §6.6 — Use CTRL+K solamente durante una excepcion y despues de notificar al Lead.",
    fieldDef:
      "CTRL+K = tecla para saltar el Pick actual durante el manejo de excepciones.",
    highlightLine: 0,
  },
  [WorkflowStep.EX_NOTIFY_LEAD]: {
    action: "Informe al Lead en persona o por radio y luego presione Continuar",
    sopContext:
      "§6.5.1 / §6.6 — El Lead debe conocer cada excepcion antes de que usted salte o cierre el Pick.",
    highlightLine: 0,
  },
  [WorkflowStep.EX_ITEM_TO_AMNESTY_BIN]: {
    action: "Lleve el articulo incorrecto al Amnesty Bin y presione Continuar",
    sopContext:
      "§6.5.1 — Despues de llevar la tote al Putwall, coloque el articulo incorrecto en el Amnesty Bin.",
    fieldDef:
      "Amnesty Bin = contenedor de la Zone para articulos incorrectos o danados.",
    highlightLine: 0,
  },
  [WorkflowStep.EX_ITEM_TO_IC]: {
    action: "Lleve el articulo incorrecto al area de IC y presione Continuar",
    sopContext:
      "§6.5.2 — Inventory Control debe investigar el articulo y corregir el registro de ubicacion.",
    fieldDef:
      "IC = Inventory Control. Confirme con el Lead donde se encuentra el punto de entrega.",
    highlightLine: 0,
  },
}
