/**
 * coachingContent.ts — Step-by-step coaching content for BEGINNER mode
 *
 * Written for a brand new GEODIS warehouse employee with zero prior experience.
 * SOP section references follow BBWD-WI-030 exactly.
 *
 * Coaching is shown ONLY when session.difficulty === BEGINNER.
 * Content disappears immediately on correct action — stays visible on error.
 *
 * Per CLAUDE.md §Content Rules §Labs: explain the "why" behind each step,
 * completable by a new hire with zero warehouse experience.
 */

import { WorkflowStep } from "@/types/domain"
import type { CoachingContent } from "@/types/coaching"

// ─────────────────────────────────────────────────────────────────────────────
// COACHING CONTENT MAP
// Keyed by WorkflowStep — Partial because not every step needs coaching
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-step coaching content for BEGINNER mode.
 * highlightLine values are 0-based indices into screen.lines[].
 */
export const COACHING_CONTENT: Partial<Record<WorkflowStep, CoachingContent>> =
  {
    // ── BUILD CART — LOGIN ───────────────────────────────────────────────────

    [WorkflowStep.BC_LOGIN_RF]: {
      action: "Type your User ID and press ENTER",
      sopContext:
        "§5.1.5 — Log into the RF Device before any picking can begin. The system tracks all picks and errors to your User ID so your supervisor can review your performance.",
      fieldDef:
        "USER ID = your GEODIS employee login number. It is printed on your badge or given to you by your Lead. Ask your Lead or supervisor if you do not have one yet.",
      highlightLine: 1,
    },

    // ── BUILD CART — MENU NAVIGATION ────────────────────────────────────────

    [WorkflowStep.BC_SELECT_BBWD]: {
      action: "Type 1 and press ENTER to select BBWD",
      sopContext:
        "§5.1.6 — BBWD is the outbound picking system used at this GEODIS facility. You must enter this menu first before you can access the picking interface. Type the number exactly — the RF Device is case-sensitive.",
      highlightLine: 3,
    },

    [WorkflowStep.BC_SELECT_OUTBOUND]: {
      action: "Type 2 and press ENTER to select Outbound Phase II",
      sopContext:
        "§5.1.7 — Outbound Phase II is the active picking mode at this facility. It connects you to the correct work queue so the system assigns you pick locations for outbound orders.",
      highlightLine: 3,
    },

    // ── BUILD CART — TASK GROUP ──────────────────────────────────────────────

    [WorkflowStep.BC_PRESS_CTRL_T]: {
      action: "Press the ^T button in the key bar below",
      sopContext:
        "§5.1.8 — CTRL+T changes your Task Group. You must set your Task Group before the system can assign pick locations. Without it, the RF Device does not know which zone or order batch to give you.",
      fieldDef:
        "Task Group = the batch of orders you will pick, organized by zone (e.g. Z1, Z2, FEX for Express). Your Lead or Tasker tells you which zone to use before your shift starts.",
    },

    [WorkflowStep.BC_CONFIRM_TASK_GROUP]: {
      action:
        "Verify the GROUP shown matches your assigned zone, then press ENTER",
      sopContext:
        "§5.1.8 — Press Enter to lock in your Task Group. The RF Device requires confirmation before assigning you a zone. The GROUP field shows what zone you are about to pick in — verify it matches what your Lead told you.",
      fieldDef:
        "GROUP = your assigned pick zone or task group code shown on screen. If it looks wrong, press CTRL+T again and re-scan the correct zone barcode from your Lead.",
      highlightLine: 1,
    },

    [WorkflowStep.BC_SCAN_ZONE_TASK_GROUP]: {
      action:
        "Scan the zone barcode on the laminated card or cage tag for your area",
      sopContext:
        "§5.1.9 — Scanning the zone barcode finalizes your task group assignment. The barcode is on a laminated card hanging at your zone entrance or on the cage tag your Lead provided.",
      fieldDef:
        "ZONE = your assigned work area in the warehouse: Z1, Z2, Z3, Z4 (standard), HAZ (hazardous materials), or FEX (Express — high-priority orders that must be picked first).",
      highlightLine: 1,
    },

    // ── BUILD CART — CART SETUP ──────────────────────────────────────────────

    [WorkflowStep.BC_SELECT_MAKE_TOTE_CART]: {
      action: "Type 1 and press ENTER to select Make Tote Cart BB",
      sopContext:
        "§5.1.10 — 'Make Tote Cart BB' is the US facility option for setting up a blue-bin tote cart. This creates a new cart record in the WMS linked to your login session.",
      highlightLine: 2,
    },

    [WorkflowStep.BC_SCAN_CART_BARCODE]: {
      action:
        "Scan the Pick Cart barcode on the physical cart label. Use the scanner trigger or type the barcode manually.\n⚡ Note: the simulator may inject a training error at this step — if it does, this is intentional. Follow the exception steps that appear.",
      sopContext:
        "§5.1.11 — Scanning the cart barcode links this specific physical cart to your picking session in the WMS. Without this step, the system cannot track which totes and orders belong to your cart.",
      fieldDef:
        "PICK CART # = the unique barcode label attached to the side of your metal picking cart. It starts with the letter C followed by 9 digits, for example: C000000083.",
      highlightLine: 1,
    },

    // ── BUILD CART — TOTE SCANNING ───────────────────────────────────────────

    [WorkflowStep.BC_PLACE_TOTE_IN_SLOT]: {
      action:
        "Place the physical tote in the slot number shown on screen, then press Continue",
      sopContext:
        "§5.1.12 — Before scanning, physically seat the tote in the correct numbered slot on your cart. The slot number is painted or labeled on the cart frame. Each of the 9 slots must have its own tote.",
      fieldDef:
        "SLOT = the numbered position on your cart (1 through 9). Each slot holds one tote. The SLOT number on screen tells you exactly which position to fill.",
      highlightLine: 2,
    },

    [WorkflowStep.BC_SCAN_TOTE_BARCODE]: {
      action:
        "Scan the barcode on the tote for the slot shown — repeat for all 9 totes",
      sopContext:
        "§5.1.12–13 — You must scan all 9 totes to register them in the system. The RF Device shows which slot it is waiting for. After each scan, it advances to the next slot. When slot 9 is complete, press CTRL+E to finalize.",
      fieldDef:
        "TOTE barcode = the barcode label on the plastic tote container. It starts with the letter T. Scan the tote that is physically seated in the slot shown on screen.",
      highlightLine: 4,
    },

    [WorkflowStep.BC_PRESS_CTRL_E]: {
      action:
        "All 9 totes are registered — press Continue to enter the Pick Phase",
      sopContext:
        "§5.1.15 — Your cart is now active in the WMS. CTRL+E has been accepted and your cart is locked in. Press Continue to receive your first pick assignment.",
    },

    // ── PICK PHASE — NAVIGATION ──────────────────────────────────────────────

    [WorkflowStep.PK_READ_PICK_DISPLAY]: {
      action: "Read the ALOC on screen — that is where you need to walk to — then press Continue",
      sopContext:
        "§5.2.5 — The RF Device automatically shows your next pick location. Read the ALOC (shelf address) before you start moving. Memorizing it reduces the chance of going to the wrong shelf.",
      fieldDef:
        "ALOC = Aisle Location — the physical shelf address you need to walk to. The format is AAA-NNN-NN (aisle-bay-level), for example 316-001-A1 means aisle 316, bay 001, level A1.",
      highlightLine: 1,
    },

    [WorkflowStep.PK_TRAVEL_TO_LOCATION]: {
      action: "Push your cart to the ALOC shown, then press Continue when you arrive",
      sopContext:
        "§5.2.6 — Travel to the Pick Front (shelf face) shown on your RF Device. Bring your cart with you. If aisles are busy, look for the ALOC number on the floor or shelf-end signs.",
      fieldDef:
        "ALOC = Aisle Location. Level A = bottom shelf, B = middle, C = top. For example 316-001-A1 = aisle 316, bay 001, bottom shelf.",
      highlightLine: 1,
    },

    [WorkflowStep.PK_VERIFY_LOCATION]: {
      action:
        "Check that the shelf label matches the ALOC on your screen exactly, then press Continue",
      sopContext:
        "§5.2.7 — Always verify you are at the correct location before picking. The shelf label must exactly match the ALOC on your RF Device. If it does NOT match, press CTRL+W to go back without recording an error.",
      highlightLine: 1,
    },

    [WorkflowStep.PK_VERIFY_ITEM]: {
      action:
        "Look at the item on the shelf — confirm it matches the ITEM on screen — then press Continue. ⚡ Note: the simulator may inject a training error scenario at the next step. If it does, this is intentional — follow the exception steps that appear.",
      sopContext:
        "§5.2.8 — Visually verify the item before scanning. Check the SKU number or description on the packaging matches what the RF Device shows. If it looks wrong, do NOT scan — press CTRL+W to back out.",
      fieldDef:
        "ITEM = the product SKU code. ITEM (LAST 4) = the last 4 digits of the UPC barcode are shown as a quick visual check. Compare these digits to the barcode on the physical item.",
      highlightLine: 2,
    },

    // ── PICK PHASE — SCANNING ────────────────────────────────────────────────

    [WorkflowStep.PK_SCAN_ITEM_UPC]: {
      action:
        "Scan the UPC barcode on the physical item using the side trigger or SCAN button",
      sopContext:
        "§5.2.9 — Scanning the UPC barcode validates that you have the correct item. Hold the scanner 4–8 inches from the barcode and pull the side trigger or press SCAN. If the scan fails, try different angles or lighting.",
      fieldDef:
        "ITEM BARCODE = the UPC barcode on the item's packaging. It is a series of black and white vertical bars. Do not scan the shelf label — scan the item itself.",
      highlightLine: 5,
    },

    // ── PICK PHASE — QUANTITY + TOTE ─────────────────────────────────────────

    [WorkflowStep.PK_PICK_QUANTITY]: {
      action:
        "Pick exactly the number of units shown in QTY REQUIRED — take them off the shelf now — then press Continue",
      sopContext:
        "§5.2.10 — Take the required number of units from the shelf. Count carefully. Picking too few or too many causes customer order errors and requires IC correction.",
      fieldDef:
        "QTY REQUIRED = how many units to pick for this order line. Always pick the exact number shown — not more, not less.",
      highlightLine: 1,
    },

    [WorkflowStep.PK_PLACE_IN_TOTE]: {
      action: "Place the picked items into the tote shown on screen, then press Continue",
      sopContext:
        "§5.2.11 — Put the items into the correct tote on your cart. The TOTE ID on screen tells you which tote to use. Make sure all items are fully inside the tote before continuing.",
      fieldDef:
        "TOTE = one of the 9 barcoded containers on your cart. Match the Tote ID on screen to the T-number on the tote label. Putting items in the wrong tote creates order errors.",
      highlightLine: 0,
    },

    [WorkflowStep.PK_ENTER_QUANTITY]: {
      action: "Type how many units you just placed in the tote, then press ENTER",
      sopContext:
        "§5.2.12 — Enter the exact quantity you placed in the tote. This records the pick in the WMS. The number must match what you actually put in — if you picked short, enter the actual amount and notify your Lead.",
      highlightLine: 2,
    },

    [WorkflowStep.PK_SCAN_TOTE_BARCODE]: {
      action: "Scan the barcode on the tote where you placed the item",
      sopContext:
        "§5.2.13 — Scanning the tote confirms which physical container received the item. This final scan links the pick to the correct tote in the WMS and completes the pick record.",
      fieldDef:
        "TOTE barcode = the barcode label on the outside of the tote container. It starts with T. Scan the same tote you just put the items into.",
      highlightLine: 0,
    },

    // ── PICK PHASE — END OF TOTE ─────────────────────────────────────────────

    [WorkflowStep.PK_END_OF_TOTE_DISPLAY]: {
      action: "Press the ^A button in the key bar below to confirm tote complete",
      sopContext:
        "§5.2.14 — 'End Of Tote' means this tote cannot accept any more items — it is full. Press CTRL+A to confirm it complete, then take it to the Putwall (conveyor) immediately.",
      fieldDef:
        "End Of Tote = the tote has reached its capacity limit and is now closed. After pressing ^A, carry the tote to the nearest Putwall (the conveyor system in your zone).",
      highlightLine: 1,
    },

    [WorkflowStep.PK_PRESS_CTRL_A]: {
      action:
        "Carry the completed tote to the nearest Putwall (conveyor) and place it on, then press Continue",
      sopContext:
        "§5.2.15 — Your tote is now locked in the system as complete. Take it to the Putwall (the powered conveyor belt) in your zone right away. Do not leave it on your cart.",
      fieldDef:
        "Putwall = the downstream conveyor system that moves completed totes toward the shipping area. It is clearly marked in your zone — look for the moving belt.",
    },

    [WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR]: {
      action: "Slide the tote onto the Putwall conveyor, then press Continue",
      sopContext:
        "§5.2.16 — Place the tote onto the Putwall so it flows downstream to the shipping team. Once it is on the belt, press Continue to resume picking with your remaining totes.",
      fieldDef:
        "Putwall = the conveyor belt in your pick zone that transports completed totes to packing and shipping. Ensure the tote is seated stable on the belt before releasing it.",
    },

    // ── PICK STAGE — ROUND TRANSITIONS ───────────────────────────────────────

    [WorkflowStep.PS_CONTINUE_NEXT_TOTE]: {
      action: "Press Continue to start picking items for your next tote",
      sopContext:
        "Your current tote is on the Putwall and the system has advanced to the next tote. You will now receive pick locations for the remaining totes on your cart.",
    },

    [WorkflowStep.PS_ROUND_COMPLETE]: {
      action: "Round complete — review your score below",
      sopContext:
        "You have finished all picks in this scenario. The system has calculated your accuracy and speed score. Review your results and ask your Lead for feedback on any errors.",
    },

    // ── EXCEPTION HANDLING ────────────────────────────────────────────────────
    // Per BBWD-WI-030 §6 — Coaching is MOST important during exceptions.
    // Every exception needs: action, sopContext, and a plain-English fieldDef.

    [WorkflowStep.EX_TOTE_ALREADY_ALLOCATED]: {
      action:
        "Set this tote aside and do NOT use it — press Continue to retry with a different tote",
      sopContext:
        "§6.1 — 'Tote already allocated' means this tote barcode is still active in the system from a previous session that was not closed properly. Do not try to force it through — set it aside for your Lead to resolve.",
      fieldDef:
        "'Tote already allocated' = the tote you scanned is already checked out to someone else in the WMS. Get a fresh, unused tote from the tote rack and scan that one instead.",
    },

    [WorkflowStep.EX_CART_ALREADY_CREATED]: {
      action:
        "Set this cart aside and do NOT use it — press Continue to get a different cart",
      sopContext:
        "§6.2 — 'Pick Cart Already Created' means this cart is still active in the system from a previous picking session. Your Lead or supervisor must resolve it in the WMS before it can be used again.",
      fieldDef:
        "'Cart Already Created' error = the cart barcode is assigned to an open session in the system. Take a different cart from the staging area and restart the Build Cart process.",
    },

    [WorkflowStep.EX_INCORRECT_LOCATION]: {
      action:
        "Press the ^W button in the key bar below, then re-check your shelf location",
      sopContext:
        "§6.3 — You attempted to scan at the wrong location. CTRL+W cancels your current step and takes you back to re-verify. Re-read the ALOC on your RF Device and make sure the shelf label matches exactly.",
      fieldDef:
        "'Incorrect Location' = your scan was rejected because the location you are at does not match the ALOC shown on the RF Device. Walk back and compare the shelf label character by character.",
      highlightLine: 2,
    },

    [WorkflowStep.EX_INCORRECT_TOTE]: {
      action:
        "Press the ^W button in the key bar below, then scan the correct tote",
      sopContext:
        "§6.4 — You tried to scan the wrong tote. Press CTRL+W to go back. Look at the TOTE ID on your RF Device screen and find the matching tote on your cart — match by the T-number.",
      fieldDef:
        "'Incorrect Tote' = you scanned a tote barcode that does not match what the RF Device is expecting. Check the screen for the correct Tote ID and scan that specific tote.",
      highlightLine: 2,
    },

    [WorkflowStep.EX_INVALID_ITEM_LAST]: {
      action:
        "Notify your Lead immediately — then press ^K to skip this pick and proceed to the Putwall",
      sopContext:
        "§6.5.1 — The item you scanned is incorrect AND it is the last item at this shelf location. You MUST notify your Lead before proceeding. After notifying, press CTRL+K. The system will route you to place your current tote on the Putwall, then take the wrong item to the Amnesty Bin.",
      fieldDef:
        "'Invalid Item (last at location)' = you picked the wrong product and there are no more items at this location for re-picking. This must be reported to your Lead immediately so inventory can be investigated.",
      highlightLine: 1,
    },

    [WorkflowStep.EX_INVALID_ITEM_NOT_LAST]: {
      action:
        "Notify your Lead, take the tote to the Putwall, then bring the wrong item to IC — press Continue",
      sopContext:
        "§6.5.2 — The item you scanned is incorrect but more items remain at the location. Notify your Lead, take your current tote to the Putwall, and bring the wrong item directly to Inventory Control (IC) for resolution.",
      fieldDef:
        "IC = Inventory Control department. They investigate and correct inventory discrepancies. The IC tote or drop area is usually near the Command Center — ask your Lead for its exact location.",
      highlightLine: 1,
    },

    [WorkflowStep.EX_SHORT_INVENTORY]: {
      action:
        "Double-check you are physically at the correct shelf, then press Continue to notify your Lead",
      sopContext:
        "§6.6 — 'Short Inventory' means the system expects an item at this location but you cannot find it. First verify you are at exactly the right shelf (re-read the ALOC digit by digit). If you are at the right place and the item is truly missing, notify your Lead.",
      fieldDef:
        "'Short Inventory' = the item the system is asking for is not physically present at the shelf location. It may have been picked by a previous picker in error, or the inventory record may be wrong.",
      highlightLine: 1,
    },

    [WorkflowStep.EX_DAMAGED_ITEM]: {
      action:
        "Place the damaged item in the Amnesty Bin — use a ziplock bag first if it is leaking — then press Continue",
      sopContext:
        "§6.7 — Damaged items cannot be shipped to customers. They must be isolated immediately. If the item contains any liquid that is leaking, place it in a ziplock bag first to prevent contaminating other inventory.",
      fieldDef:
        "Amnesty Bin = the designated container in your zone for items that cannot be picked (damaged, incorrect, or unscannable). Ask your Lead if you cannot locate it in your area.",
      highlightLine: 1,
    },

    [WorkflowStep.EX_PRESS_CTRL_W]: {
      action: "Press the ^W button in the key bar below",
      sopContext:
        "§6.3 — CTRL+W takes you back to the previous screen without advancing the pick. Use it whenever you notice you are at the wrong location or have the wrong item — it is the safe undo key on the RF Device.",
      fieldDef:
        "CTRL+W = the 'go back' key. It cancels your current action and returns you to the verification step so you can correct your mistake before the system records an error.",
      highlightLine: 2,
    },

    [WorkflowStep.EX_PRESS_CTRL_K]: {
      action: "Press the ^K button in the key bar below to skip this pick",
      sopContext:
        "§6.5.1 / §6.6 — CTRL+K skips the current pick from your queue. Only use it after notifying your Lead and receiving instruction to skip. Never use CTRL+K to avoid a difficult scan — only use it during exception resolution.",
      fieldDef:
        "CTRL+K = skip pick. This removes the current pick from your queue and advances to the next one. It is only valid during exception handling after your Lead has been notified.",
      highlightLine: 0,
    },

    [WorkflowStep.EX_NOTIFY_LEAD]: {
      action:
        "Walk to your Lead or call them on the radio — tell them what happened — then press Continue",
      sopContext:
        "§6.5.1 / §6.6 — Your Lead needs to know about every exception so they can track inventory discrepancies and provide coaching. Always notify your Lead in person or by radio before pressing CTRL+K to skip.",
      highlightLine: 0,
    },

    [WorkflowStep.EX_ITEM_TO_AMNESTY_BIN]: {
      action:
        "Carry the wrong item to the Amnesty Bin in your zone, then press Continue",
      sopContext:
        "§6.5.1 — After taking your tote to the Putwall, bring the incorrectly picked item to the Amnesty Bin. IC will investigate how the wrong item ended up at that location.",
      fieldDef:
        "Amnesty Bin = the collection container for items that were picked incorrectly or are damaged. Located in your zone — ask your Lead if you cannot find it.",
      highlightLine: 0,
    },

    [WorkflowStep.EX_ITEM_TO_IC]: {
      action:
        "Carry the wrong item to the IC (Inventory Control) tote, then press Continue",
      sopContext:
        "§6.5.2 — Inventory Control (IC) tracks and resolves inventory discrepancies. Taking the wrong item to the IC area allows them to re-count and correct the location record.",
      fieldDef:
        "IC = Inventory Control. The IC drop-off area is typically at or near the Command Center. Ask your Lead for the exact location if you are unsure.",
      highlightLine: 0,
    },
  }
