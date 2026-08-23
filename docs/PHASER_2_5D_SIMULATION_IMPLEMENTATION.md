# Phaser 2.5D Interactive Warehouse Picking Simulation

## Overview & Executive Summary
This document summarizes the full technical implementation of the **2.5D Interactive Warehouse Picking Simulation** for WarehousePro (GEODIS BBWD Training Platform). The system combines video-extracted static keyframe background plates, high-resolution isolated 2D sprites, an interactive HTML5 Canvas environment managed by **Phaser 4**, and a floating **Symbol WT4000 RF Device** emulator overlay built with **React 18** and **Tailwind CSS**.

---

## Architecture & Tech Stack

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         PhaserSimulationShell (React 18)                         │
│                                                                                  │
│  ┌──────────────────────────────────────────────┐  ┌──────────────────────────┐  │
│  │     PhaserWarehouseCanvas (Client Mount)     │  │  Floating Symbol RF HUD  │  │
│  │                                              │  │     (WT4000PhotoShell)   │  │
│  │  ┌────────────────────────────────────────┐  │  │                          │  │
│  │  │       PhaserWarehouseScene (2.5D)      │  │  │  - Photo-realistic LCD   │  │
│  │  │                                        │  │  │  - Physical keypad hits  │  │
│  │  │  • Base Plates (Aisle & Conveyor)      │  │  │  - Monospace 20x6 chars  │  │
│  │  │  • 3-Tier Aluminum Pick Cart (0.48x)   │  │  │  - Soft-key bar (^T, ^E, │  │
│  │  │  • 9 Pre-positioned Gray Totes         │  │  │    ^A, ^W, ^K) >= 44px   │  │
│  │  │  • 9 Slot Number Overlays (1-9)        │  │  │  - Dockable modes        │  │
│  │  │  • Cart Barcode (C000000083)           │  │  │    (Right/Bottom/Min)    │  │
│  │  │  • Bulk Zone Placard Hotspots (Rafter) │  │  └──────────────────────────┘  │
│  │  │  • Pick Shelves & Item UPC Hotspots    │  │                                │
│  │  │  • Conveyor Drop Zone Hotspot          │  │  ┌──────────────────────────┐  │
│  │  │  • Progressive Zoom: zoomTo(2.0, 700)  │  │  │      CoachingPanel       │  │
│  │  │  • Laser Scan Beam & Audio FX          │  │  │  (SOP Context & Action)  │  │
│  │  └────────────────────────────────────────┘  │  └──────────────────────────┘  │
│  └──────────────────────────────────────────────┘                                │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. Asset Processing & Keyframe Extraction
- Extracted static high-resolution plates from `Geniea3e7caa0bc634cbfaf29a122720e8c03.mp4` using OpenCV:
  - `public/assets/simulation/aisle_plate.jpg`: Main staging aisle keyframe at 00:00 showing yellow Bulk Zone overhead rafter placards and staging floor marks.
  - `public/assets/simulation/conveyor_plate.jpg`: Conveyor belt area keyframe at 00:25 showing downstream conveyor line and tote staging area.
- Integrated isolated sprites:
  - `public/assets/simulation/Aluminum_warehouse_pick_cart.png`: 3-tier aluminum pick cart.
  - `public/assets/simulation/Gray_storage_tote.png`: GEODIS gray storage pick tote.

### 2. Phaser 2.5D Scene (`PhaserWarehouseScene.ts`)
- **Cart & Tote Grid Setup**:
  - Anchored the pick cart in the lower foreground at `x: width / 2, y: height - 165` (scale `0.48`).
  - Rendered crisp Phaser Text directly over the 9 white label spots on the cart shelves:
    - Tier 1 (Top): Slots 1, 2, 3
    - Tier 2 (Middle): Slots 4, 5, 6
    - Tier 3 (Bottom): Slots 7, 8, 9
  - Positioned the Cart Barcode `C000000083` over the top-left label spot with interactive hit detection.
  - Pre-positioned 9 `Gray_storage_tote` sprite instances (3 per tier) with visibility toggled off until each slot is loaded during the `Make Tote Cart BB` SOP.
- **Interactive Hotspot Layer**:
  - **Bulk Zone Placards**: Overhead rafter targets with pulsing yellow borders and clickable hitboxes for zone verification (`Z1`).
  - **Pick Shelves & Item UPCs**: Zoom target displaying location label `316-001-A1`, animated simulated barcode, and item UPC `024505572001`.
  - **Conveyor Belt Drop Zone**: Downstream putwall drop target with pulsing arrow and tote sliding animation.
- **Camera Mechanics**:
  - Progressive zoom `zoomTo(2.0, 700)` with `Cubic.easeInOut` tweening when traveling to a pick shelf location.
  - Smooth reset to overview `zoomTo(1.0, 600)` during cart building and wrap-up steps.
  - Background plate crossfade (`aisle_plate` $\to$ `conveyor_plate`) during `PK_END_OF_TOTE_DISPLAY` and `PK_PLACE_TOTE_ON_CONVEYOR`.
- **Laser Scan Beam & Particle FX**:
  - Dynamic cyan/green laser sweep across the clicked barcode rectangle (260ms duration, Quad easing).
  - Target reticle flash with audio sync.

### 3. Client-Only Canvas Component (`PhaserWarehouseCanvas.tsx`)
- Dynamically imported Phaser and `PhaserWarehouseScene` inside `useEffect` (`ssr: false`) to eliminate any Next.js window reference issues.
- Canvas configured with `Phaser.Scale.FIT` and `autoCenter: Phaser.Scale.CENTER_BOTH` to guarantee sharp rendering and responsive scaling on tablet viewports (iPad landscape, portrait, Android tablets).
- Synchronized Zustand store events (`useSimulation`) with Phaser scene updates.
- Floating camera HUD with quick controls: Reset View, Focus Shelf, Focus Conveyor, Focus Aisle.

### 4. Tablet-Optimized Application Shell (`PhaserSimulationShell.tsx`)
- Dedicated full-viewport shell for tablets and desktop training stations.
- Floating Symbol RF Device overlay (`WT4000PhotoShell` / `RFDevice`):
  - Dockable to Right or Bottom, or Collapsible/Minimizable to prevent obstructing the 2.5D warehouse canvas.
  - Touch targets calibrated to minimum 44px–48px for finger taps on tablets.
- Unobtrusive SOP Step Guidance card in upper right displaying real-time SOP instructions.
- Integrated with `WarehouseFloor.tsx` via a mode switcher (`2.5D Keyframe` / `3D Scene` / `Schematic`).

---

## SOP Workflow Alignment Matrix

| Step ID | SOP Action | User Interaction | 2.5D Canvas / RF Behavior |
| :--- | :--- | :--- | :--- |
| `BC_LOGIN_RF` | User Login | Type User ID (e.g. `101`) + Enter | RF Device accepts login, advances to menu |
| `BC_SELECT_BBWD` | Select BBWD | Type `1` + Enter | Highlights BBWD menu option |
| `BC_SELECT_OUTBOUND` | Select Outbound | Type `2` + Enter | Navigates to Outbound Phase II |
| `BC_PRESS_CTRL_T` | Change Task Group | Press `CTRL+T` on keypad | Shifts task group mode |
| `BC_CONFIRM_TASK_GROUP` | Confirm Group | Press Enter twice | Prompts to scan Zone barcode |
| `BC_SCAN_ZONE_TASK_GROUP` | Scan Zone Placard | Tap Bulk Zone rafter placard on canvas | Laser scan beam fires on rafter placard |
| `BC_SELECT_MAKE_TOTE_CART` | Make Tote Cart BB | Type `1` + Enter | Advances to Cart scan screen |
| `BC_SCAN_CART_BARCODE` | Scan Cart Barcode | Tap Cart Barcode `C000000083` | Laser beam scans cart top-left badge |
| `BC_SCAN_TOTE_BARCODE` | Scan Totes 1–9 | Tap Tote slots 1 through 9 on cart | Totes become visible on cart tiers (1 to 9) |
| `BC_PRESS_CTRL_E` | Finalize Cart | Press `CTRL+E` on keypad | Completes cart build; initiates Pick Stage |
| `PK_TRAVEL_TO_LOCATION` | Travel to Pick Front | Confirm physical travel | Camera smooth pan & `zoomTo(2.0, 700)` to shelf |
| `PK_SCAN_ITEM_UPC` | Scan Item Barcode | Tap Item UPC hotspot on zoomed shelf | Laser scan fires on item barcode |
| `PK_ENTER_QUANTITY` | Enter Quantity | Type qty + Enter on RF Device | RF validates quantity required |
| `PK_SCAN_TOTE_BARCODE` | Scan Target Tote | Tap target tote on cart | Ring pulses on target tote slot |
| `PK_END_OF_TOTE_DISPLAY` | End Of Tote | Press `CTRL+A` on RF Device | Crossfade transitions plate to conveyor area |
| `PK_PLACE_TOTE_ON_CONVEYOR` | Tote to Conveyor | Tap Conveyor Belt drop zone | Tote slides onto conveyor belt to Putwall |
| `PS_ROUND_COMPLETE` | Round Complete | View final score & metrics | Displays score, accuracy, speed breakdown |

---

## Verification & Testing

1. **Automated Unit & Integration Tests**:
   - `src/components/warehouse/phaser/PhaserWarehouseScene.test.ts`: Verified scene instantiation, bridge callback binding, and canvas rendering.
   - Vitest suite passed: **20 test files, 184 tests passed**.
2. **TypeScript Strict Compilation**:
   - `npx tsc --noEmit`: **0 errors**.
3. **Browser Execution & Visual Check**:
   - Tested live via Next.js dev server on port 3005.
