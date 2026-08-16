import { describe, expect, it } from "vitest"
import { COACHING_CONTENT } from "@/data/coachingContent"
import { COACHING_CONTENT_ES } from "@/data/coachingContent.es"

describe("Spanish coaching content", () => {
  it("covers every workflow step with English coaching", () => {
    expect(Object.keys(COACHING_CONTENT_ES).sort()).toEqual(
      Object.keys(COACHING_CONTENT).sort()
    )
  })

  it("provides an action and SOP reference for every translated step", () => {
    for (const content of Object.values(COACHING_CONTENT_ES)) {
      expect(content?.action.trim()).not.toBe("")
      expect(content?.sopContext).toMatch(/^§/)
    }
  })
})
