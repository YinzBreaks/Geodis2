import { describe, expect, it } from "vitest"
import { ContentType, DifficultyLevel, ScanResult, WorkflowStep, Zone } from "@/types/domain"
import { validateContentDocument } from "@/schemas/content-validation"

const step = {
  stepId: "step-001",
  order: 1,
  workflowStep: WorkflowStep.BC_LOGIN_RF,
  instruction: "Log into the RF Device.",
  explanation: "The system must identify the picker.",
  expectedAction: { type: "CONFIRM", message: "Logged in" },
  sopReference: "BBWD-WI-030 §5.1.5",
}

function simulation() {
  return {
    moduleId: "sim-test",
    title: "Test Simulation",
    description: "A valid test simulation.",
    contentType: ContentType.SIMULATION,
    difficulty: DifficultyLevel.BEGINNER,
    estimatedMinutes: 10,
    zone: Zone.Z1,
    pickCount: 10,
    toteCount: 9,
    sopDocuments: ["BBWD-WI-030"],
    version: "1.0.0",
    lastUpdated: "2026-08-16",
    scoringWeights: { accuracy: 0.6, speed: 0.4 },
    passCriteria: { minScore: 70, maxErrors: 3 },
    errorScenarios: [
      {
        scenarioId: "error-1",
        injectAtPickIndex: 2,
        errorType: ScanResult.WRONG_ITEM,
        description: "Invalid item",
        expectedResolution: [WorkflowStep.EX_NOTIFY_LEAD],
        sopReference: "BBWD-WI-030 §6.5.1",
      },
      {
        scenarioId: "error-2",
        injectAtPickIndex: 6,
        errorType: ScanResult.ITEM_NOT_FOUND,
        description: "Short inventory",
        expectedResolution: [WorkflowStep.EX_NOTIFY_LEAD],
        sopReference: "BBWD-WI-030 §6.6",
      },
    ],
    steps: [step],
  }
}

describe("content validation", () => {
  it("accepts a valid simulation", () => {
    expect(validateContentDocument("simulations", simulation(), "sim.json")).toEqual([])
  })

  it("rejects a simulation with an out-of-range error", () => {
    const value = simulation()
    value.errorScenarios[0].injectAtPickIndex = 10
    expect(validateContentDocument("simulations", value, "sim.json")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("out of range") }),
      ])
    )
  })

  it("requires lab explanations", () => {
    const lab = {
      moduleId: "lab-test",
      title: "Test Lab",
      description: "A valid test lab.",
      contentType: ContentType.LAB,
      difficulty: DifficultyLevel.BEGINNER,
      estimatedMinutes: 10,
      prerequisites: [],
      sopDocuments: ["BBWD-WI-030"],
      version: "1.0.0",
      lastUpdated: "2026-08-16",
      steps: [{ ...step, explanation: "" }],
      passCriteria: { requiredSteps: ["step-001"] },
    }
    expect(validateContentDocument("labs", lab, "lab.json")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("explanation") }),
      ])
    )
  })

  it("requires minimum question bank coverage", () => {
    const bank = {
      bankId: "bank-test",
      title: "Test Bank",
      sopDocuments: ["BBWD-WI-030"],
      version: "1.0.0",
      lastUpdated: "2026-08-16",
      questions: [],
    }
    expect(validateContentDocument("questions", bank, "questions.json")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("10 questions") }),
      ])
    )
  })

  it("requires directive frontmatter and body", () => {
    expect(validateContentDocument("directives", "# Missing metadata", "directive.md")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("frontmatter") }),
      ])
    )
  })
})
