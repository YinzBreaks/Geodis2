/**
 * PhaserWarehouseScene.ts — 2.5D Interactive Warehouse Picking Simulation Scene
 *
 * Implements:
 * 1. Dual-plate background rendering (Aisle Plate & Conveyor Plate) with crossfades
 * 2. 3-tier Aluminum Pick Cart anchored in foreground with 9 tote slots and cart barcode
 * 3. 9 Gray Storage Tote instances (3x3 grid) toggled on as slots are scanned
 * 4. Interactive Hotspots: Bulk Zone Placards, Pick Shelves, Item UPCs, Conveyor Drop Zone
 * 5. Camera Mechanics: zoomTo(2.0, 700) progressive zoom & pan to pick zones, smooth reset
 * 6. Laser Scan Beam & Particle FX with 60fps WebGL/Canvas rendering
 */

import * as Phaser from "phaser"
import {
  WorkflowStep,
  DifficultyLevel,
  type SimulationSession,
  type WarehouseLocation,
  type WarehouseItem,
} from "@/types/domain"

export interface HotspotConfig {
  id: string
  label: string
  barcode?: string
  x: number
  y: number
  width: number
  height: number
  type: "zone" | "cart" | "tote" | "location" | "item" | "conveyor"
  toteSlot?: number
  actionType?: "SCAN" | "CONFIRM"
}

export interface SceneBridgeCallbacks {
  onScan: (barcode: string) => void
  onConfirm: () => void
  onHotspotClick?: (hotspot: HotspotConfig) => void
  onCameraChange?: (zoom: number, target: string) => void
}

export class PhaserWarehouseScene extends Phaser.Scene {
  // World container — holds the background plates & all environmental hotspots
  // so cover-scaling can be applied once, locking hotspots to the plate.
  private worldContainer!: Phaser.GameObjects.Container

  // Plates
  private aislePlate!: Phaser.GameObjects.Image
  private conveyorPlate!: Phaser.GameObjects.Image

  // Foreground Cart & Totes
  private cartContainer!: Phaser.GameObjects.Container
  private cartSprite!: Phaser.GameObjects.Image
  private cartBarcodeBadge!: Phaser.GameObjects.Container
  private slotTextObjects: Phaser.GameObjects.Text[] = []
  public cartTotes: Phaser.GameObjects.Container[] = []
  private toteSprites: Phaser.GameObjects.Container[] = []
  private toteSlotBadges: Phaser.GameObjects.Container[] = []

  // Interactive Hotspot Containers
  private hotspotGroup!: Phaser.GameObjects.Group
  private zonePlacardHotspots: Phaser.GameObjects.Container[] = []
  private shelfHotspotContainer!: Phaser.GameObjects.Container
  private itemHotspotContainer!: Phaser.GameObjects.Container
  private conveyorHotspotContainer!: Phaser.GameObjects.Container
  private conveyorDropZone!: Phaser.GameObjects.Rectangle

  // Visual Effects
  private laserScanBeam!: Phaser.GameObjects.Rectangle
  private scanReticle!: Phaser.GameObjects.Container
  private ambientGlow!: Phaser.GameObjects.Graphics

  // State
  private session: SimulationSession | null = null
  private difficulty: DifficultyLevel = DifficultyLevel.BEGINNER
  private callbacks: SceneBridgeCallbacks = {
    onScan: () => {},
    onConfirm: () => {},
  }
  private currentPlate: "aisle" | "conveyor" = "aisle"
  private activeHighlightedBarcode: string | null = null
  private isZoomedToShelf: boolean = false
  private targetShelfLoc: string = "316-001-A1"

  // Interaction hardening
  private lastScanAt = 0
  private reducedMotion = false
  private pulseTweens: Phaser.Tweens.Tween[] = []

  /**
   * Minimum gap between two accepted hotspot scans. A double-tap on the same
   * hotspot would otherwise dispatch a second SCAN after the step already
   * advanced, logging a spurious error against the trainee.
   */
  private static readonly SCAN_COOLDOWN_MS = 350

  constructor() {
    super({ key: "PhaserWarehouseScene" })
  }

  public init(data: {
    session?: SimulationSession
    difficulty?: DifficultyLevel
    callbacks?: SceneBridgeCallbacks
    reducedMotion?: boolean
  }) {
    if (data.session) this.session = data.session
    if (data.difficulty) this.difficulty = data.difficulty
    if (data.callbacks) this.callbacks = { ...this.callbacks, ...data.callbacks }
    if (data.reducedMotion !== undefined) this.reducedMotion = data.reducedMotion
  }

  /**
   * Toggle reduced-motion at runtime: pauses infinite pulse loops (leaving the
   * indicator at a steady visible state) and makes camera pans/zooms and plate
   * crossfades instant. Mirrors the DOM-side `.reduced-motion` class.
   */
  public setReducedMotion(flag: boolean) {
    this.reducedMotion = flag
    for (const tween of this.pulseTweens) {
      if (!tween || tween.isDestroyed()) continue
      if (flag) {
        tween.pause()
        for (const target of tween.targets as Phaser.GameObjects.GameObject[]) {
          const t = target as unknown as { setAlpha?: (a: number) => void }
          t.setAlpha?.(1)
        }
      } else {
        tween.resume()
      }
    }
  }

  /** Effective tween/camera duration honoring reduced-motion. */
  private motionMs(duration: number): number {
    return this.reducedMotion ? 0 : duration
  }

  /**
   * Register an infinite attention-pulse tween so reduced-motion can pause it.
   */
  private addPulseTween(config: Phaser.Types.Tweens.TweenBuilderConfig): Phaser.Tweens.Tween {
    const tween = this.tweens.add(config)
    this.pulseTweens.push(tween)
    if (this.reducedMotion) {
      tween.pause()
      for (const target of tween.targets as Phaser.GameObjects.GameObject[]) {
        const t = target as unknown as { setAlpha?: (a: number) => void }
        t.setAlpha?.(1)
      }
    }
    return tween
  }

  /**
   * Dispatch a hotspot scan with a double-tap cooldown. Returns true when the
   * scan was accepted (callers should only fire the beam FX on acceptance).
   */
  private emitScan(barcode: string): boolean {
    const now = this.time.now
    if (now - this.lastScanAt < PhaserWarehouseScene.SCAN_COOLDOWN_MS) {
      return false
    }
    this.lastScanAt = now
    this.callbacks.onScan(barcode)
    return true
  }

  /**
   * Fire the scan beam over a game object using its WORLD transform, so the
   * beam lands on the hotspot regardless of worldContainer cover-scaling,
   * cart re-anchoring on resize, or camera zoom.
   */
  private beamOnObject(
    obj: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject,
    width: number,
    height: number
  ) {
    const m = obj.getWorldTransformMatrix()
    this.triggerScanBeam(m.tx, m.ty, width * Math.abs(m.scaleX), height * Math.abs(m.scaleY))
  }

  public setBridgeCallbacks(callbacks: SceneBridgeCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks }
  }

  public preload() {
    // 1. Background plates
    this.load.image("aisle_plate", "/assets/simulation/aisle_plate.jpg")
    this.load.image("conveyor_plate", "/assets/simulation/conveyor_plate.jpg")

    // 2. Isolated sprites
    this.load.image("pick_cart", "/assets/simulation/Aluminum_warehouse_pick_cart.png")
    this.load.image("gray_tote", "/assets/simulation/Gray_storage_tote.png")
  }

  public create() {
    const { width, height } = this.scale

    // Early container initializations to prevent undefined lifecycle access
    this.worldContainer = this.add.container(0, 0)
    this.shelfHotspotContainer = this.add.container(0, 0).setVisible(false)
    this.conveyorHotspotContainer = this.add.container(0, 0).setVisible(false)
    this.cartContainer = this.add.container(0, 0)
    this.hotspotGroup = this.add.group()
    this.zonePlacardHotspots = []
    this.cartTotes = []
    this.toteSprites = this.cartTotes

    // ── 1. BACKGROUND PLATES LAYER ──────────────────────────────────────────
    // Positioned at native image center (not viewport center) so the plate's
    // pixel coordinate frame stays fixed — resize() scales worldContainer instead.
    this.conveyorPlate = this.add.image(0, 0, "conveyor_plate").setAlpha(0).setDepth(1)
    this.conveyorPlate.setPosition(this.conveyorPlate.width / 2, this.conveyorPlate.height / 2)

    this.aislePlate = this.add.image(0, 0, "aisle_plate").setAlpha(1).setDepth(2)
    this.aislePlate.setPosition(this.aislePlate.width / 2, this.aislePlate.height / 2)

    this.worldContainer.add([this.conveyorPlate, this.aislePlate])

    // Ambient warehouse lighting gradient — screen-space overlay, stays outside
    // worldContainer so it always covers the full viewport.
    this.ambientGlow = this.add.graphics().setDepth(3)
    this.drawAmbientLighting(width, height)

    // ── 2. HOTSPOT GROUP ────────────────────────────────────────────────────
    // Create Bulk Zone Placard hotspots on rafters
    this.createZonePlacardHotspots()

    // Create Shelf & Item UPC hotspot container
    this.createShelfAndItemHotspots()

    // Create Conveyor Belt drop hotspot container
    this.createConveyorHotspot()

    // Lock all environmental hotspots to the same coordinate frame as the
    // background plates so they scale/pan together and never drift.
    this.worldContainer.add([
      ...this.zonePlacardHotspots,
      this.shelfHotspotContainer,
      this.conveyorHotspotContainer,
    ])

    // ── 3. PICK CART & 9-TOTE GRID SETUP ────────────────────────────────────
    // Cart stays outside worldContainer — it is anchored to the viewport
    // bottom independently in resize().
    this.createPickCartAndTotes(width, height)

    // ── 4. LASER SCAN BEAM & RETICLE FX ─────────────────────────────────────
    this.createScanEffects()

    // Setup input interactions & keyboard camera shortcuts
    this.setupInteractions()

    // Initial responsive cover scaling & resize listener
    this.scale.on("resize", this.resize, this)
    this.resize(this.scale.gameSize)

    // If session was passed on init, apply it immediately
    if (this.session) {
      this.updateSimulationState(this.session, this.difficulty)
    }
  }

  /**
   * Responsive canvas resize handler with CSS cover scaling for background plates
   */
  public resize(gameSize: Phaser.Structs.Size) {
    const width = gameSize.width
    const height = gameSize.height

    // CSS "cover" scaling applied to the whole worldContainer (background
    // plate + every hotspot) instead of each image individually — this
    // mathematically locks hotspot X/Y to the scaled background plate.
    if (this.worldContainer && this.aislePlate && this.aislePlate.width > 0) {
      const plateW = this.aislePlate.width
      const plateH = this.aislePlate.height
      const coverScale = Math.max(width / plateW, height / plateH)
      const offsetX = (width - plateW * coverScale) / 2
      const offsetY = (height - plateH * coverScale) / 2
      this.worldContainer.setScale(coverScale).setPosition(offsetX, offsetY)
    }

    if (this.ambientGlow) {
      this.drawAmbientLighting(width, height)
    }

    // Cart is anchored independently to the bottom of the viewport, separate
    // from worldContainer, so it always rests on the floor regardless of
    // background plate scaling.
    if (this.cartContainer) {
      this.cartContainer.setPosition(width / 2, height - 250)
    }
  }

  /**
   * Draw atmospheric warehouse lighting and floor guidelines
   */
  private drawAmbientLighting(width: number, height: number) {
    this.ambientGlow.clear()
    // Soft top rafter shadow
    this.ambientGlow.fillGradientStyle(
      0x050b14,
      0x050b14,
      0x000000,
      0x000000,
      0.35,
      0.35,
      0.0,
      0.0
    )
    this.ambientGlow.fillRect(0, 0, width, 180)

    // Soft warm floor bounce
    this.ambientGlow.fillGradientStyle(
      0x000000,
      0x000000,
      0x0b1928,
      0x0b1928,
      0.0,
      0.0,
      0.25,
      0.25
    )
    this.ambientGlow.fillRect(0, height - 140, width, 140)
  }

  /**
   * Bulk Zone Placards: Rafter targets mapped over overhead rafters
   */
  private createZonePlacardHotspots() {
    const placards: Array<{
      id: string
      label: string
      barcode: string
      x: number
      y: number
      w: number
      h: number
    }> = [
      { id: "zone-bulk-main", label: "Bulk Zone Placard", barcode: "Z1", x: 1040, y: 410, w: 100, h: 54 },
      { id: "zone-p1", label: "Overhead Zone 1", barcode: "Z1", x: 100, y: 180, w: 140, h: 80 },
      { id: "zone-p2", label: "Overhead Zone 2", barcode: "Z1", x: 400, y: 260, w: 100, h: 60 },
      { id: "zone-p3", label: "Overhead Zone 3", barcode: "Z1", x: 620, y: 300, w: 80, h: 50 },
      { id: "zone-p4", label: "Overhead Zone 4", barcode: "Z1", x: 790, y: 340, w: 60, h: 40 },
    ]

    placards.forEach((p) => {
      const container = this.add.container(p.x, p.y).setDepth(15)

      // Interactive hit area
      const hitRect = this.add
        .rectangle(0, 0, p.w, p.h, 0xf59e0b, 0.05)
        .setStrokeStyle(2, 0xf59e0b, 0.6)
        .setInteractive({ useHandCursor: true })

      // Glowing pulsing border
      const pulseRect = this.add
        .rectangle(0, 0, p.w + 6, p.h + 6, 0xf59e0b, 0)
        .setStrokeStyle(1.5, 0xfbbf24, 0.8)

      this.addPulseTween({
        targets: pulseRect,
        alpha: { from: 0.3, to: 0.9 },
        scaleX: 1.04,
        scaleY: 1.04,
        yoyo: true,
        repeat: -1,
        duration: 900,
      })

      // Badge label
      const tagBg = this.add.rectangle(0, p.h / 2 + 12, p.w + 20, 18, 0x0f172a, 0.85).setStrokeStyle(1, 0xf59e0b, 0.8)
      const tagText = this.add
        .text(0, p.h / 2 + 12, `BULK ZONE · ${p.barcode}`, {
          fontFamily: "monospace",
          fontSize: "9px",
          color: "#fef08a",
          fontStyle: "bold",
        })
        .setOrigin(0.5)

      container.add([hitRect, pulseRect, tagBg, tagText])

      hitRect.on("pointerover", () => {
        hitRect.setFillStyle(0xf59e0b, 0.25)
        tagBg.setFillStyle(0xd97706, 0.95)
      })

      hitRect.on("pointerout", () => {
        hitRect.setFillStyle(0xf59e0b, 0.05)
        tagBg.setFillStyle(0x0f172a, 0.85)
      })

      hitRect.on("pointerdown", () => {
        if (!this.emitScan(p.barcode)) return
        this.beamOnObject(container, p.w, p.h)
        if (this.callbacks.onHotspotClick) {
          this.callbacks.onHotspotClick({
            id: p.id,
            label: p.label,
            barcode: p.barcode,
            x: p.x,
            y: p.y,
            width: p.w,
            height: p.h,
            type: "zone",
          })
        }
      })

      this.zonePlacardHotspots.push(container)
      this.hotspotGroup.add(container)
    })
  }

  /**
   * Pick Shelves & Item UPCs: Zoom target with barcode badges
   */
  private createShelfAndItemHotspots() {
    // Container for pick shelf location & items
    this.shelfHotspotContainer.removeAll(true)
    this.shelfHotspotContainer.setPosition(480, 520).setDepth(20).setVisible(false)

    // Shelf location frame
    const locBox = this.add
      .rectangle(0, -60, 260, 60, 0x0284c7, 0.12)
      .setStrokeStyle(2, 0x38bdf8, 0.9)
      .setInteractive({ useHandCursor: true })

    const locText = this.add
      .text(0, -60, "LOCATION: 316-001-A1", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#38bdf8",
        fontStyle: "bold",
      })
      .setOrigin(0.5)

    locBox.on("pointerdown", () => {
      this.beamOnObject(locBox, 260, 60)
      this.callbacks.onConfirm()
    })

    // Item UPC Target Box
    this.itemHotspotContainer = this.add.container(0, 30)

    const itemBox = this.add
      .rectangle(0, 0, 240, 90, 0x10b981, 0.15)
      .setStrokeStyle(2, 0x34d399, 1)
      .setInteractive({ useHandCursor: true })

    // Barcode simulated lines
    const barcodeVisual = this.createSimulatedBarcode(180, 32)
    barcodeVisual.setPosition(0, -10)

    const upcLabel = this.add
      .text(0, 24, "UPC: 024505572001", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#6ee7b7",
        fontStyle: "bold",
      })
      .setOrigin(0.5)

    const scanHint = this.add
      .text(0, -32, "TAP TO SCAN ITEM", {
        fontFamily: "sans-serif",
        fontSize: "10px",
        color: "#a7f3d0",
        fontStyle: "bold",
      })
      .setOrigin(0.5)

    this.itemHotspotContainer.add([itemBox, barcodeVisual, upcLabel, scanHint])

    itemBox.on("pointerover", () => {
      itemBox.setFillStyle(0x10b981, 0.3)
    })

    itemBox.on("pointerout", () => {
      itemBox.setFillStyle(0x10b981, 0.15)
    })

    itemBox.on("pointerdown", () => {
      const upc = this.session?.pickQueue[this.session.currentPickIndex]?.item.upcBarcode || "024505572001"
      if (!this.emitScan(upc)) return
      this.beamOnObject(itemBox, 240, 90)
    })

    this.shelfHotspotContainer.add([locBox, locText, this.itemHotspotContainer])
  }

  /**
   * Conveyor Belt Drop Zone: Drop target activated during tote handoff
   */
  private createConveyorHotspot() {
    this.conveyorHotspotContainer.removeAll(true)
    this.conveyorHotspotContainer.setPosition(760, 420).setDepth(20).setVisible(false)

    this.conveyorDropZone = this.add
      .rectangle(0, 0, 380, 130, 0x3b82f6, 0.15)
      .setStrokeStyle(3, 0x60a5fa, 0.9)
      .setInteractive({ useHandCursor: true })

    const dropIcon = this.add
      .text(0, -25, "▼ PLACE TOTE ON CONVEYOR ▼", {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#93c5fd",
        fontStyle: "bold",
      })
      .setOrigin(0.5)

    const subText = this.add
      .text(0, 15, "PUTWALL DOWNSTREAM LINE", {
        fontFamily: "sans-serif",
        fontSize: "11px",
        color: "#dbeafe",
      })
      .setOrigin(0.5)

    // Pulsing conveyor arrow tween
    this.addPulseTween({
      targets: dropIcon,
      y: -18,
      yoyo: true,
      repeat: -1,
      duration: 650,
      ease: "Sine.easeInOut",
    })

    this.conveyorHotspotContainer.add([this.conveyorDropZone, dropIcon, subText])

    this.conveyorDropZone.on("pointerover", () => {
      this.conveyorDropZone.setFillStyle(0x3b82f6, 0.35)
    })

    this.conveyorDropZone.on("pointerout", () => {
      this.conveyorDropZone.setFillStyle(0x3b82f6, 0.15)
    })

    this.conveyorDropZone.on("pointerdown", () => {
      if (this.session?.currentStep !== WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR) {
        return
      }
      // Disable immediately so a second tap can't re-trigger the slide/confirm.
      this.conveyorDropZone.disableInteractive()
      this.beamOnObject(this.conveyorDropZone, 380, 130)
      // Confirm (which advances the step and can swap the camera/background)
      // only after the tote finishes sliding onto the conveyor — otherwise the
      // scene changes out from under the animation before it's visible.
      this.animateToteToConveyor(() => this.callbacks.onConfirm())
    })
  }

  /**
   * Pick Cart & 9 Totes setup
   * Anchors cart sprite in lower foreground layer with slot labels & totes
   */
  private createPickCartAndTotes(width: number, height: number) {
    // Anchor cart container in lower foreground
    const cartX = width / 2
    const cartY = height - 250
    this.cartContainer = this.add.container(cartX, cartY).setDepth(30)

    // Pick cart base image (original 1200x896 -> scaled to 0.4)
    const cartScale = 0.4
    this.cartSprite = this.add.image(0, 0, "pick_cart").setScale(cartScale).setOrigin(0.5, 0.5)

    this.cartContainer.add(this.cartSprite)

    // ── Cart Barcode Overlay (top-left label) ──────────────────────────────
    // Center relative to cart at scale 0.4: (-352 * 0.4, -331 * 0.4) = (-141, -132)
    this.cartBarcodeBadge = this.add.container(-141, -132)

    const cartBcHit = this.add
      .rectangle(0, 0, 50, 16, 0x0f172a, 0.85)
      .setStrokeStyle(1.5, 0x38bdf8, 0.9)
      .setInteractive({ useHandCursor: true })

    const cartBcText = this.add
      .text(0, 0, "C000000083", {
        fontFamily: "monospace",
        fontSize: "7px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)

    this.cartBarcodeBadge.add([cartBcHit, cartBcText])
    this.cartContainer.add(this.cartBarcodeBadge)

    cartBcHit.on("pointerdown", () => {
      const bc = this.session?.cart.cartBarcode || "C000000083"
      if (!this.emitScan(bc)) return
      // World transform keeps the beam on the badge after the cart container
      // is re-anchored by resize() — the create-time cartX/cartY go stale.
      this.beamOnObject(cartBcHit, 50, 16)
    })

    // ── 9 Slot Labels & 9 Gray Storage Totes ─────────────────────────────────
    // Scaled at 0.4 for tablet viewports:
    // Tier 1 (Top): Slots 1, 2, 3
    // Tier 2 (Mid): Slots 4, 5, 6
    // Tier 3 (Bot): Slots 7, 8, 9
    const slotConfigs: Array<{
      slot: number
      tier: number
      labelX: number
      labelY: number
      toteX: number
      toteY: number
    }> = [
      // Tier 1 (Top)
      { slot: 1, tier: 1, labelX: -90, labelY: -132, toteX: -90, toteY: -80 },
      { slot: 2, tier: 1, labelX: 0, labelY: -132, toteX: 0, toteY: -80 },
      { slot: 3, tier: 1, labelX: 93, labelY: -132, toteX: 93, toteY: -80 },
      // Tier 2 (Middle)
      { slot: 4, tier: 2, labelX: -90, labelY: -8, toteX: -90, toteY: 46 },
      { slot: 5, tier: 2, labelX: 0, labelY: -8, toteX: 0, toteY: 46 },
      { slot: 6, tier: 2, labelX: 93, labelY: -8, toteX: 93, toteY: 46 },
      // Tier 3 (Bottom)
      { slot: 7, tier: 3, labelX: -87, labelY: 104, toteX: -87, toteY: 150 },
      { slot: 8, tier: 3, labelX: 0, labelY: 104, toteX: 0, toteY: 150 },
      { slot: 9, tier: 3, labelX: 90, labelY: 104, toteX: 90, toteY: 150 },
    ]

    slotConfigs.forEach((cfg) => {
      // 1. Slot Number Text rendered directly over the white label spots
      const labelContainer = this.add.container(cfg.labelX, cfg.labelY)
      const labelBg = this.add
        .rectangle(0, 0, 38, 14, 0x1e293b, 0.9)
        .setStrokeStyle(1, 0x94a3b8, 0.8)
        .setInteractive({ useHandCursor: true })

      const slotText = this.add
        .text(0, 0, `SLOT ${cfg.slot}`, {
          fontFamily: "monospace",
          fontSize: "7px",
          color: "#f8fafc",
          fontStyle: "bold",
        })
        .setOrigin(0.5)

      labelContainer.add([labelBg, slotText])
      this.cartContainer.add(labelContainer)
      this.slotTextObjects.push(slotText)
      this.toteSlotBadges.push(labelContainer)

      // 2. Pre-position Gray Storage Tote Sprite (3 per shelf across 3 tiers)
      const toteContainer = this.add.container(cfg.toteX, cfg.toteY).setVisible(false)

      const toteImg = this.add
        .image(0, 0, "gray_tote")
        .setScale(0.075) // Scaled to fit cart bay at 0.4
        .setOrigin(0.5, 0.5)
        .setInteractive({ useHandCursor: true })

      // Tote Barcode Tag on tote front
      const toteBarcodeTag = this.add
        .rectangle(0, 8, 32, 10, 0xffffff, 0.95)
        .setStrokeStyle(1, 0x0f172a, 0.9)

      const toteBarcodeText = this.add
        .text(0, 8, "", {
          fontFamily: "monospace",
          fontSize: "5.5px",
          color: "#0f172a",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setName("toteBarcodeText")

      // Highlight ring for active pick target tote
      const highlightRing = this.add
        .rectangle(0, 0, 58, 66, 0x38bdf8, 0)
        .setStrokeStyle(2, 0x38bdf8, 0.9)
        .setName("highlightRing")

      this.addPulseTween({
        targets: highlightRing,
        alpha: { from: 0.2, to: 1.0 },
        yoyo: true,
        repeat: -1,
        duration: 700,
      })

      toteContainer.add([toteImg, toteBarcodeTag, toteBarcodeText, highlightRing])
      this.cartContainer.add(toteContainer)
      this.toteSprites.push(toteContainer)
      this.cartTotes.push(toteContainer)

      // Click handler on tote
      toteImg.on("pointerdown", () => {
        const toteBarcode = this.barcodeForSlot(cfg.slot)
        if (!toteBarcode || !this.emitScan(toteBarcode)) return
        this.beamOnObject(toteContainer, 36, 36)
      })

      labelBg.on("pointerdown", () => {
        const toteBarcode = this.barcodeForSlot(cfg.slot)
        if (!toteBarcode || !this.emitScan(toteBarcode)) return
        this.beamOnObject(labelContainer, 38, 14)
      })
    })
  }

  /**
   * Resolve the barcode a click on a cart slot should scan.
   *
   * During Build Cart the slot is still empty and the picker is grabbing a tote
   * off the stack (§5.1.13), so the top stack tote is scanned. Once a slot holds
   * a tote, that tote's own barcode is used — which is what the Pick phase
   * confirms against. Returns null when there is nothing legitimate to scan;
   * synthesizing a plausible-looking barcode here silently produced scans that
   * belonged to no real tote.
   */
  private barcodeForSlot(slot: number): string | null {
    if (!this.session) return null
    const assigned = this.session.cart.totes[slot - 1]?.barcode
    if (assigned && assigned.length > 0) return assigned
    return this.session.toteStack[0] ?? null
  }

  /**
   * Helper to create simulated black & white barcode graphics
   */
  private createSimulatedBarcode(w: number, h: number): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0)
    const bg = this.add.rectangle(0, 0, w, h, 0xffffff, 1)
    container.add(bg)

    // Draw vertical bars
    const g = this.add.graphics()
    g.fillStyle(0x000000, 1)

    const barCount = 28
    const step = (w - 12) / barCount
    const startX = -w / 2 + 6

    for (let i = 0; i < barCount; i++) {
      const isThick = i % 3 === 0 || i % 7 === 0
      const barW = isThick ? 2.5 : 1.2
      const x = startX + i * step
      g.fillRect(x, -h / 2 + 3, barW, h - 6)
    }

    container.add(g)
    return container
  }

  /**
   * Create scan beam and reticle visual fx
   */
  private createScanEffects() {
    // Laser line
    this.laserScanBeam = this.add
      .rectangle(0, 0, 100, 3, 0x00ffcc, 1)
      .setDepth(100)
      .setVisible(false)

    // Scan Reticle
    this.scanReticle = this.add.container(0, 0).setDepth(99).setVisible(false)
    const reticleBox = this.add.rectangle(0, 0, 48, 48, 0x00ffcc, 0.08).setStrokeStyle(2, 0x00ffcc, 0.8)
    this.scanReticle.add(reticleBox)
  }

  /**
   * Trigger laser scan beam across a target rect with audio sync
   */
  public triggerScanBeam(targetX: number, targetY: number, w: number, h: number) {
    this.laserScanBeam.setPosition(targetX, targetY - h / 2)
    this.laserScanBeam.setDisplaySize(w + 20, 3)
    this.laserScanBeam.setAlpha(1).setVisible(true)

    // Animate laser sweep downwards
    this.tweens.add({
      targets: this.laserScanBeam,
      y: targetY + h / 2,
      alpha: { from: 1, to: 0.2 },
      duration: 260,
      ease: "Quad.easeOut",
      onComplete: () => {
        this.laserScanBeam.setVisible(false)
      },
    })

    // Reticle flash
    this.scanReticle.setPosition(targetX, targetY).setVisible(true).setScale(1.2).setAlpha(0)
    this.tweens.add({
      targets: this.scanReticle,
      scaleX: 1.0,
      scaleY: 1.0,
      alpha: { from: 0.9, to: 0 },
      duration: 350,
      onComplete: () => {
        this.scanReticle.setVisible(false)
      },
    })
  }

  /**
   * Progressive camera zoom mechanic:
   * zoomTo(2.0, 700) when traveling to a pick shelf location
   */
  public zoomToShelf(targetLocation: string = "316-001-A1", duration: number = 700) {
    this.isZoomedToShelf = true
    this.targetShelfLoc = targetLocation

    // Pan towards the active shelf zone and zoom in 2.0x
    const focusX = 500
    const focusY = 490

    const d = this.motionMs(duration)
    this.cameras.main.pan(focusX, focusY, d, "Cubic.easeInOut")
    this.cameras.main.zoomTo(2.0, d, "Cubic.easeInOut")

    if (this.callbacks.onCameraChange) {
      this.callbacks.onCameraChange(2.0, targetLocation)
    }
  }

  /**
   * Smooth camera reset to overview
   */
  public resetToOverview(duration: number = 600) {
    this.isZoomedToShelf = false
    const { width, height } = this.scale

    const d = this.motionMs(duration)
    this.cameras.main.pan(width / 2, height / 2, d, "Cubic.easeInOut")
    this.cameras.main.zoomTo(1.0, d, "Cubic.easeInOut")

    if (this.callbacks.onCameraChange) {
      this.callbacks.onCameraChange(1.0, "overview")
    }
  }

  /**
   * Crossfade plate to conveyor area
   */
  public transitionToConveyor(duration: number = 800) {
    if (this.currentPlate === "conveyor") return
    this.currentPlate = "conveyor"

    const d = this.motionMs(duration)
    this.tweens.add({
      targets: this.conveyorPlate,
      alpha: 1,
      duration: d,
      ease: "Linear",
    })

    this.tweens.add({
      targets: this.aislePlate,
      alpha: 0,
      duration: d,
      ease: "Linear",
    })

    // Slide pick cart slightly to the left to reveal conveyor line
    this.tweens.add({
      targets: this.cartContainer,
      x: 320,
      duration: d,
      ease: "Cubic.easeOut",
    })

    this.conveyorHotspotContainer?.setVisible(true)
    this.resetToOverview(duration)
  }

  /**
   * Transition back to aisle plate
   */
  public transitionToAisle(duration: number = 800) {
    if (this.currentPlate === "aisle") return
    this.currentPlate = "aisle"

    const d = this.motionMs(duration)
    this.tweens.add({
      targets: this.aislePlate,
      alpha: 1,
      duration: d,
      ease: "Linear",
    })

    this.tweens.add({
      targets: this.conveyorPlate,
      alpha: 0,
      duration: d,
      ease: "Linear",
    })

    const { width } = this.scale
    this.tweens.add({
      targets: this.cartContainer,
      x: width / 2,
      duration: d,
      ease: "Cubic.easeOut",
    })

    this.conveyorHotspotContainer?.setVisible(false)
  }

  /**
   * Animate completed tote sliding onto conveyor line, then invoke onComplete
   * once the tote is actually off-screen — callers must not advance the
   * workflow step until the slide is visually finished.
   */
  private animateToteToConveyor(onComplete?: () => void) {
    const activeSlot = this.session?.pickQueue[this.session.currentPickIndex]?.targetSlot || 1
    const tote = this.toteSprites[activeSlot - 1]
    if (!tote || this.reducedMotion) {
      // Reduced-motion mode confirms immediately — no slide animation.
      onComplete?.()
      return
    }

    // Clone a visual tote sprite in world coords for conveyor slide
    const worldPos = tote.getWorldTransformMatrix()
    const tempTote = this.add
      .image(worldPos.tx, worldPos.ty, "gray_tote")
      .setScale(0.09)
      .setDepth(50)

    // Slide target: the conveyor drop zone's WORLD position (the container
    // lives inside the cover-scaled worldContainer, so its create-time
    // coordinates are not screen coordinates).
    const conveyorPos = this.conveyorHotspotContainer.getWorldTransformMatrix()

    // Slide onto conveyor belt and down the line
    this.tweens.add({
      targets: tempTote,
      x: conveyorPos.tx,
      y: conveyorPos.ty,
      scale: 0.12,
      duration: 700,
      ease: "Cubic.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: tempTote,
          x: this.scale.width + 120,
          y: conveyorPos.ty + 20,
          alpha: 0,
          duration: 900,
          ease: "Linear",
          onComplete: () => {
            tempTote.destroy()
            onComplete?.()
          },
        })
      },
    })
  }

  /**
   * Update full state from React Zustand store
   */
  public updateSimulationState(session: SimulationSession, difficulty: DifficultyLevel) {
    this.session = session
    this.difficulty = difficulty

    // Guard if scene is not yet created or objects not initialized
    if (!this.shelfHotspotContainer || !this.cartContainer || !this.toteSprites) {
      return
    }

    const step = session.currentStep

    // ── 1. Update Tote visibility on Cart ──────────────────────────────────
    // Iterate through this.cartTotes: if a slot has a tote assigned, setVisible(true)
    this.cartTotes.forEach((toteSprite, idx) => {
      const slot = idx + 1
      const tote = session.cart.totes.find((t) => t.slot === slot) || session.cart.totes[idx]
      // A slot holds a tote exactly when one has been scanned into it. Totes now
      // appear on the cart one at a time as the picker builds it, instead of all
      // nine being present from the start.
      const isAssigned = Boolean(tote?.barcode && tote.barcode.length > 0)

      if (toteSprite) {
        toteSprite.setVisible(isAssigned)

        // Show the tote's real barcode tail rather than a synthetic slot label.
        const bcText = toteSprite.getByName("toteBarcodeText") as Phaser.GameObjects.Text
        if (bcText && tote?.barcode) {
          bcText.setText(tote.barcode.slice(-6))
        }

        // Highlight ring on active pick target tote
        const currentPick = session.pickQueue[session.currentPickIndex]
        const isTarget = currentPick && currentPick.targetSlot === slot
        const ring = toteSprite.getByName("highlightRing") as Phaser.GameObjects.Rectangle
        if (ring) {
          ring.setVisible(Boolean(isTarget && step === WorkflowStep.PK_SCAN_TOTE_BARCODE))
        }
      }
    })

    // ── 2. Handle Plate Transitions & Camera Zooms ─────────────────────────
    if (
      step === WorkflowStep.PK_END_OF_TOTE_DISPLAY ||
      step === WorkflowStep.PK_PRESS_CTRL_A ||
      step === WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR
    ) {
      this.transitionToConveyor()
      this.shelfHotspotContainer?.setVisible(false)
    } else {
      if (this.currentPlate === "conveyor") {
        this.transitionToAisle()
      }

      // Camera progressive zoom based on workflow step
      if (
        step === WorkflowStep.PK_TRAVEL_TO_LOCATION ||
        step === WorkflowStep.PK_VERIFY_LOCATION ||
        step === WorkflowStep.PK_VERIFY_ITEM ||
        step === WorkflowStep.PK_SCAN_ITEM_UPC ||
        step === WorkflowStep.PK_PICK_QUANTITY ||
        step === WorkflowStep.PK_PLACE_IN_TOTE
      ) {
        this.shelfHotspotContainer?.setVisible(true)
        const pick = session.pickQueue[session.currentPickIndex]
        const locLabel = pick?.location.displayLabel || "316-001-A1"
        if (!this.isZoomedToShelf) {
          this.zoomToShelf(locLabel, 700)
        }
      } else {
        this.shelfHotspotContainer?.setVisible(false)
        if (this.isZoomedToShelf) {
          this.resetToOverview(600)
        }
      }
    }

    // ── 3. Placard highlights ──────────────────────────────────────────────
    const isScanningZone = step === WorkflowStep.BC_SCAN_ZONE_TASK_GROUP
    this.zonePlacardHotspots?.forEach((c) => {
      c?.setAlpha(isScanningZone ? 1.0 : 0.6)
    })

    // ── 4. Conveyor Drop Zone Interactivity Guard (Infinite Tote Fix) ───────
    if (step === WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR) {
      this.conveyorDropZone?.setInteractive({ useHandCursor: true })
    } else {
      this.conveyorDropZone?.disableInteractive()
    }
  }

  private setupInteractions() {
    // Phaser listens on window, so bare-letter hotkeys would fire while the
    // trainee types "z"/"c" into the RF Device input. Ignore them whenever a
    // DOM form control has focus.
    const domInputHasFocus = () => {
      const el = document.activeElement
      return (
        el instanceof HTMLElement &&
        (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)
      )
    }

    // Keyboard camera hotkeys for testing & accessibility
    this.input.keyboard?.on("keydown-Z", () => {
      if (domInputHasFocus()) return
      if (this.isZoomedToShelf) {
        this.resetToOverview()
      } else {
        this.zoomToShelf()
      }
    })

    this.input.keyboard?.on("keydown-C", () => {
      if (domInputHasFocus()) return
      if (this.currentPlate === "aisle") {
        this.transitionToConveyor()
      } else {
        this.transitionToAisle()
      }
    })
  }
}
