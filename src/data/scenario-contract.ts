import type { ScenarioBundle } from "@/data/seedData"

export interface ScenarioContractIssue {
  field: string
  message: string
}

/** Validate one executable simulation bundle against production content rules. */
export function validateScenarioBundle(
  key: string,
  bundle: ScenarioBundle
): ScenarioContractIssue[] {
  const issues: ScenarioContractIssue[] = []
  const { scenario, pickQueue, cart } = bundle

  if (pickQueue.length < 10) {
    issues.push({ field: "pickQueue", message: `${key} must contain at least 10 Picks` })
  }
  if (scenario.pickCount !== pickQueue.length) {
    issues.push({ field: "pickCount", message: "Scenario pickCount must match its Pick queue" })
  }
  if (scenario.toteCount !== 9 || cart.totes.length !== 9) {
    issues.push({ field: "toteCount", message: "Every Cart must contain exactly 9 totes" })
  }

  const activeErrors = scenario.errorScenarios.filter(
    (error) => error.injectAtPickIndex >= 0 && error.injectAtPickIndex < pickQueue.length
  )
  if (activeErrors.length < 2) {
    issues.push({ field: "errorScenarios", message: "At least two errors must inject during the simulation" })
  }
  if (new Set(activeErrors.map((error) => error.errorType)).size < 2) {
    issues.push({ field: "errorScenarios", message: "Injected errors must use at least two distinct types" })
  }
  if (new Set(activeErrors.map((error) => error.injectAtPickIndex)).size !== activeErrors.length) {
    issues.push({ field: "errorScenarios", message: "Only one error may inject at each Pick index" })
  }
  if (activeErrors.some((error) => error.expectedResolution.length === 0)) {
    issues.push({ field: "errorScenarios", message: "Every injected error requires an expected resolution" })
  }

  const weightTotal = scenario.scoringWeights.accuracy + scenario.scoringWeights.speed
  if (Math.abs(weightTotal - 1) > 0.0001) {
    issues.push({ field: "scoringWeights", message: "Accuracy and speed weights must total 1" })
  }

  const toteBySlot = new Map(cart.totes.map((tote) => [tote.slot, tote]))
  for (const pick of pickQueue) {
    const targetTote = toteBySlot.get(pick.targetSlot)
    if (!targetTote || targetTote.toteId !== pick.targetToteId) {
      issues.push({ field: "pickQueue", message: `Pick ${pick.pickTaskId} has an invalid target tote` })
    }
  }

  return issues
}
