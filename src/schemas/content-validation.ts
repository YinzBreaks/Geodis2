import fs from "node:fs"
import path from "node:path"
import { ContentType, DifficultyLevel, ScanResult, WorkflowStep } from "@/types/domain"

export type ContentKind = "labs" | "simulations" | "questions" | "directives"

export interface ContentIssue {
  file: string
  message: string
}

const workflowSteps = new Set(Object.values(WorkflowStep))
const difficulties = new Set(Object.values(DifficultyLevel))
const scanResults = new Set(Object.values(ScanResult))
const directiveFrontmatterFields = [
  "directiveId",
  "title",
  "sopDocument",
  "sopSection",
  "effectiveDate",
  "version",
  "relatedLabs",
  "relatedSimulations",
  "tags",
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function requiredString(value: unknown, field: string, issues: ContentIssue[], file: string): boolean {
  if (typeof value !== "string" || value.trim() === "") {
    issues.push({ file, message: `${field} must be a non-empty string` })
    return false
  }
  return true
}

function requiredArray(value: unknown, field: string, issues: ContentIssue[], file: string): unknown[] | null {
  if (!Array.isArray(value)) {
    issues.push({ file, message: `${field} must be an array` })
    return null
  }
  return value
}

function validateCommonModule(value: Record<string, unknown>, file: string, issues: ContentIssue[], contentType: ContentType): void {
  for (const field of ["moduleId", "title", "description", "version", "lastUpdated"]) {
    requiredString(value[field], field, issues, file)
  }
  if (value.contentType !== contentType) {
    issues.push({ file, message: `contentType must be ${contentType}` })
  }
  if (!difficulties.has(value.difficulty as DifficultyLevel)) {
    issues.push({ file, message: "difficulty is invalid" })
  }
  if (typeof value.estimatedMinutes !== "number" || value.estimatedMinutes <= 0) {
    issues.push({ file, message: "estimatedMinutes must be positive" })
  }
  const sopDocuments = requiredArray(value.sopDocuments, "sopDocuments", issues, file)
  if (sopDocuments && (sopDocuments.length === 0 || !sopDocuments.every((item) => typeof item === "string" && item.length > 0))) {
    issues.push({ file, message: "sopDocuments must contain at least one document" })
  }
}

function validateSteps(value: unknown, file: string, issues: ContentIssue[], labs: boolean): void {
  const steps = requiredArray(value, "steps", issues, file)
  if (!steps) return
  const orders: number[] = []
  for (let index = 0; index < steps.length; index++) {
    const rawStep = steps[index]
    if (!isRecord(rawStep)) {
      issues.push({ file, message: `steps[${index}] must be an object` })
      continue
    }
    for (const field of ["stepId", "instruction", "sopReference"]) {
      requiredString(rawStep[field], `steps[${index}].${field}`, issues, file)
    }
    if (typeof rawStep.order !== "number") orders.push(-1)
    else orders.push(rawStep.order)
    if (!workflowSteps.has(rawStep.workflowStep as WorkflowStep)) {
      issues.push({ file, message: `steps[${index}].workflowStep is invalid` })
    }
    if (!isRecord(rawStep.expectedAction)) {
      issues.push({ file, message: `steps[${index}].expectedAction is required` })
    }
    if (labs && (typeof rawStep.explanation !== "string" || rawStep.explanation.trim() === "")) {
      issues.push({ file, message: `steps[${index}].explanation is required for labs` })
    }
  }
  const expectedOrders = Array.from({ length: orders.length }, (_, index) => index + 1)
  if (JSON.stringify(orders) !== JSON.stringify(expectedOrders)) {
    issues.push({ file, message: "steps.order must be sequential starting at 1" })
  }
}

function validateLab(value: unknown, file: string): ContentIssue[] {
  const issues: ContentIssue[] = []
  if (!isRecord(value)) return [{ file, message: "lab must be an object" }]
  validateCommonModule(value, file, issues, ContentType.LAB)
  if (!Array.isArray(value.prerequisites)) issues.push({ file, message: "prerequisites must be an array" })
  validateSteps(value.steps, file, issues, true)
  if (!isRecord(value.passCriteria) || !Array.isArray(value.passCriteria.requiredSteps)) {
    issues.push({ file, message: "passCriteria.requiredSteps is required" })
  }
  return issues
}

function validateSimulation(value: unknown, file: string): ContentIssue[] {
  const issues: ContentIssue[] = []
  if (!isRecord(value)) return [{ file, message: "simulation must be an object" }]
  validateCommonModule(value, file, issues, ContentType.SIMULATION)
  if (!Object.values(["Z1", "Z2", "Z3", "Z4", "HAZ", "FEX"]).includes(value.zone as string)) issues.push({ file, message: "zone is invalid" })
  if (typeof value.pickCount !== "number" || value.pickCount < 10) issues.push({ file, message: "pickCount must be at least 10" })
  if (value.toteCount !== 9) issues.push({ file, message: "toteCount must equal 9" })
  const scoringWeights = value.scoringWeights
  if (
    !isRecord(scoringWeights) ||
    typeof scoringWeights.accuracy !== "number" ||
    typeof scoringWeights.speed !== "number" ||
    scoringWeights.accuracy + scoringWeights.speed !== 1
  ) issues.push({ file, message: "scoringWeights must total 1" })
  if (!isRecord(value.passCriteria) || typeof value.passCriteria.minScore !== "number" || value.passCriteria.minScore < 60 || value.passCriteria.minScore > 90) issues.push({ file, message: "passCriteria.minScore must be between 60 and 90" })
  const errors = requiredArray(value.errorScenarios, "errorScenarios", issues, file)
  if (errors && errors.length < 2) issues.push({ file, message: "at least two errorScenarios are required" })
  if (errors && new Set(errors.filter(isRecord).map((error) => error.errorType)).size < 2) issues.push({ file, message: "errorScenarios must contain two distinct error types" })
  if (errors) {
    for (let index = 0; index < errors.length; index++) {
      const error = errors[index]
      if (!isRecord(error)) continue
      if (typeof error.injectAtPickIndex !== "number" || error.injectAtPickIndex < 0 || error.injectAtPickIndex >= (value.pickCount as number)) issues.push({ file, message: `errorScenarios[${index}] injectAtPickIndex is out of range` })
      if (!scanResults.has(error.errorType as ScanResult)) issues.push({ file, message: `errorScenarios[${index}] errorType is invalid` })
      if (!Array.isArray(error.expectedResolution) || error.expectedResolution.length === 0) issues.push({ file, message: `errorScenarios[${index}] expectedResolution is required` })
    }
  }
  validateSteps(value.steps, file, issues, false)
  return issues
}

function validateQuestions(value: unknown, file: string): ContentIssue[] {
  const issues: ContentIssue[] = []
  if (!isRecord(value)) return [{ file, message: "question bank must be an object" }]
  for (const field of ["bankId", "title", "version", "lastUpdated"]) requiredString(value[field], field, issues, file)
  const sopDocuments = requiredArray(value.sopDocuments, "sopDocuments", issues, file)
  if (sopDocuments && sopDocuments.length === 0) issues.push({ file, message: "sopDocuments must not be empty" })
  const questions = requiredArray(value.questions, "questions", issues, file)
  if (questions && questions.length < 10) issues.push({ file, message: "question banks require at least 10 questions" })
  const steps = new Set<unknown>()
  for (let index = 0; index < (questions ?? []).length; index++) {
    const question = (questions ?? [])[index]
    if (!isRecord(question)) continue
    for (const field of ["questionId", "sopReference", "questionText", "explanation"]) requiredString(question[field], `questions[${index}].${field}`, issues, file)
    if (!workflowSteps.has(question.workflowStep as WorkflowStep)) issues.push({ file, message: `questions[${index}].workflowStep is invalid` })
    else steps.add(question.workflowStep)
    if (!difficulties.has(question.difficulty as DifficultyLevel)) issues.push({ file, message: `questions[${index}].difficulty is invalid` })
    if (!Array.isArray(question.options) || question.options.length < 2) issues.push({ file, message: `questions[${index}].options requires at least two options` })
    if (typeof question.correctOptionIndex !== "number") issues.push({ file, message: `questions[${index}].correctOptionIndex is required` })
  }
  if (steps.size < 3) issues.push({ file, message: "question banks must cover at least three WorkflowStep values" })
  return issues
}

function validateDirective(value: string, file: string): ContentIssue[] {
  const issues: ContentIssue[] = []
  if (!value.startsWith("---\n")) return [{ file, message: "directive must begin with YAML frontmatter" }]
  const end = value.indexOf("\n---", 4)
  if (end < 0) return [{ file, message: "directive frontmatter is not closed" }]
  const frontmatter = value.slice(4, end)
  for (const field of directiveFrontmatterFields) {
    if (!new RegExp(`^${field}:`, "m").test(frontmatter)) issues.push({ file, message: `directive frontmatter missing ${field}` })
  }
  if (value.slice(end + 4).trim().length === 0) issues.push({ file, message: "directive body must not be empty" })
  return issues
}

export function validateContentDocument(kind: ContentKind, value: unknown, file: string): ContentIssue[] {
  if (kind === "labs") return validateLab(value, file)
  if (kind === "simulations") return validateSimulation(value, file)
  if (kind === "questions") return validateQuestions(value, file)
  return validateDirective(typeof value === "string" ? value : "", file)
}

export function discoverContentIssues(rootDirectory: string): ContentIssue[] {
  const issues: ContentIssue[] = []
  const definitions: Array<[ContentKind, string, string]> = [
    ["labs", "labs", ".json"],
    ["simulations", "simulations", ".json"],
    ["questions", "questions", ".json"],
    ["directives", "directives", ".md"],
  ]
  for (const [kind, directory, extension] of definitions) {
    const directoryPath = path.join(rootDirectory, directory)
    const files = fs.existsSync(directoryPath)
      ? fs.readdirSync(directoryPath).filter((file) => file.endsWith(extension))
      : []
    if (files.length === 0) {
      issues.push({ file: directoryPath, message: `no ${extension} content files found` })
      continue
    }
    for (const file of files) {
      const filePath = path.join(directoryPath, file)
      try {
        const raw = fs.readFileSync(filePath, "utf8")
        const value = extension === ".json" ? JSON.parse(raw) : raw
        issues.push(...validateContentDocument(kind, value, filePath))
      } catch (error) {
        issues.push({ file: filePath, message: error instanceof Error ? error.message : "unable to read content" })
      }
    }
  }
  return issues
}
