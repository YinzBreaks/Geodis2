// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from "vitest"

beforeAll(() => {
  if (typeof window !== "undefined") {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4) }),
      putImageData: vi.fn(),
      createImageData: vi.fn(),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      fillText: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
    }) as any
  }
})

describe("PhaserWarehouseScene Unit Tests", () => {
  it("exports PhaserWarehouseScene class", async () => {
    // Dynamically import to ensure canvas mock is active
    const { PhaserWarehouseScene } = await import("./PhaserWarehouseScene")
    expect(PhaserWarehouseScene).toBeDefined()
    const scene = new PhaserWarehouseScene()
    expect(scene).toBeInstanceOf(PhaserWarehouseScene)
  })

  it("can set bridge callbacks dynamically", async () => {
    const { PhaserWarehouseScene } = await import("./PhaserWarehouseScene")
    const scene = new PhaserWarehouseScene()
    const onScan = vi.fn()
    const onConfirm = vi.fn()

    scene.setBridgeCallbacks({ onScan, onConfirm })
    expect(scene).toBeDefined()
  })
})
