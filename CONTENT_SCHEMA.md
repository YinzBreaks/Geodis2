# CONTENT_SCHEMA.md — Content File Specifications
# Format definitions for all content in /content/

---

## Overview

All content is authored in JSON and validated against TypeScript interfaces at build time.
Content is versioned — changes require a version bump and `lastUpdated` update.
Every piece of content must reference at least one `WorkflowStep` and one SOP document.

Runtime validation command: `npm run content:validate`.
The command fails when any required content directory has no authored files. This is intentional: placeholder or fabricated SOP content must not pass the production gate.

---

## Lab Module Schema (`/content/labs/*.json`)

Labs are guided, step-by-step training modules with hints. 
Target audience: Zero-experience new hires.

```json
{
  "moduleId": "lab-01-build-cart-basics",
  "title": "Build Your First Picking Cart",
  "description": "Learn to set up a picking cart on the RF Device from scratch. You'll log in, select the correct menus, scan your cart, and assign all 9 totes.",
  "contentType": "LAB",
  "difficulty": "BEGINNER",
  "estimatedMinutes": 15,
  "prerequisites": [],
  "sopDocuments": ["BBWD-VJA-030", "BBWD-WI-030"],
  "version": "1.0.0",
  "lastUpdated": "2025-01-06",
  "steps": [
    {
      "stepId": "step-001",
      "order": 1,
      "workflowStep": "BC_LOGIN_RF",
      "instruction": "Log into the RF Device using your employee credentials.",
      "explanation": "Every picking session starts with logging into the RF Device so the system knows which picker is working which cart.",
      "hint": "Use your badge ID as your username. Ask your Lead if you don't have credentials yet.",
      "expectedAction": {
        "type": "CONFIRM",
        "message": "I have logged into the RF Device"
      },
      "sopReference": "BBWD-WI-030 §5.1.5"
    },
    {
      "stepId": "step-002",
      "order": 2,
      "workflowStep": "BC_SELECT_BBWD",
      "instruction": "Type '1' for BBWD and press Enter.",
      "explanation": "BBWD is the client/account code for this facility. Selecting it routes you into the correct warehouse management system.",
      "hint": "Look for the number input field on the RF screen. Just type 1 and press the Enter key.",
      "expectedAction": {
        "type": "KEY_INPUT",
        "expectedKeys": "1+ENTER"
      },
      "sopReference": "BBWD-WI-030 §5.1.6"
    }
  ],
  "passCriteria": {
    "requiredSteps": ["step-001", "step-002"]
  }
}
```

### Lab Step Requirements
- Every step MUST have: `stepId`, `order`, `workflowStep`, `instruction`, `expectedAction`, `sopReference`
- `explanation` is REQUIRED for labs (it's the "why")
- `hint` is OPTIONAL but strongly recommended for BEGINNER labs
- Steps must be sequential with no gaps in `order`

---

## Simulation Scenario Schema (`/content/simulations/*.json`)

Simulations are timed, scored, and include injected errors.
No hints. Scored on accuracy + speed.

```json
{
  "moduleId": "sim-01-basic-pick-round",
  "title": "Basic Pick Round — Zone 1",
  "description": "Complete a single picking round in Zone 1. You'll build your cart, pick 20 items across 9 totes, and handle 2 exception scenarios.",
  "contentType": "SIMULATION",
  "difficulty": "INTERMEDIATE",
  "estimatedMinutes": 20,
  "zone": "Z1",
  "pickCount": 20,
  "toteCount": 9,
  "sopDocuments": ["BBWD-WI-030"],
  "version": "1.0.0",
  "lastUpdated": "2025-01-06",
  "scoringWeights": {
    "accuracy": 0.6,
    "speed": 0.4
  },
  "passCriteria": {
    "minScore": 75,
    "maxErrors": 5
  },
  "errorScenarios": [
    {
      "scenarioId": "err-001",
      "injectAtPickIndex": 7,
      "errorType": "WRONG_ITEM",
      "description": "Item at Pick Front does not match what's on the RF Device",
      "isLastItemAtLocation": true,
      "expectedResolution": [
        "EX_NOTIFY_LEAD",
        "EX_PRESS_CTRL_K",
        "PK_PLACE_TOTE_ON_CONVEYOR",
        "EX_ITEM_TO_AMNESTY_BIN"
      ],
      "sopReference": "BBWD-WI-030 §6.5.1"
    },
    {
      "scenarioId": "err-002",
      "injectAtPickIndex": 15,
      "errorType": "SHORT_INVENTORY",
      "description": "Item is not present at the indicated location",
      "expectedResolution": [
        "EX_PRESS_CTRL_W",
        "EX_NOTIFY_LEAD",
        "EX_PRESS_CTRL_K",
        "PS_CONTINUE_NEXT_TOTE",
        "EX_NOTIFY_LEAD"
      ],
      "sopReference": "BBWD-WI-030 §6.6"
    }
  ],
  "steps": [
    {
      "stepId": "step-001",
      "order": 1,
      "workflowStep": "BC_LOGIN_RF",
      "instruction": "Log into the RF Device.",
      "expectedAction": {
        "type": "CONFIRM",
        "message": "Logged in"
      },
      "sopReference": "BBWD-WI-030 §5.1.5"
    }
  ]
}
```

### Simulation Requirements
- Minimum 2 `errorScenarios` per simulation — non-negotiable
- `errorScenarios` must cover at least 2 different `errorType` values
- `passCriteria.minScore` must be between 60–90
- `pickCount` must be >= 10
- `toteCount` must equal 9 (always)

---

## Quiz Question Bank Schema (`/content/questions/*.json`)

Question banks are arrays of questions grouped by topic.

```json
{
  "bankId": "q-bank-keyboard-shortcuts",
  "title": "RF Device Keyboard Shortcuts",
  "sopDocuments": ["BBWD-WI-030"],
  "version": "1.0.0",
  "lastUpdated": "2025-01-06",
  "questions": [
    {
      "questionId": "q-001",
      "workflowStep": "BC_PRESS_CTRL_E",
      "sopReference": "BBWD-WI-030 §5.1.15",
      "questionType": "MULTIPLE_CHOICE",
      "difficulty": "BEGINNER",
      "tags": ["keyboard-shortcuts", "build-cart"],
      "questionText": "After scanning all 9 tote barcodes to their slots on the Pick Cart, what do you do to finalize the cart and begin picking?",
      "options": [
        "Press CTRL+A",
        "Press CTRL+E",
        "Press CTRL+K",
        "Press CTRL+W"
      ],
      "correctOptionIndex": 1,
      "explanation": "CTRL+E finalizes the Build Cart process. It tells the system all totes have been scanned and assigned to slots, and the cart is ready for picking. Per BBWD-WI-030 §5.1.15."
    },
    {
      "questionId": "q-002",
      "workflowStep": "EX_SHORT_INVENTORY",
      "sopReference": "BBWD-WI-030 §6.6",
      "questionType": "SCENARIO",
      "difficulty": "INTERMEDIATE",
      "tags": ["exceptions", "short-inventory"],
      "questionText": "You arrive at location 316-001-A1 to pick an item, but the shelf is empty. What is your FIRST action?",
      "options": [
        "Press CTRL+K to skip the pick and move on",
        "Notify your Lead immediately",
        "Verify that the physical location matches what is shown on the RF Device",
        "Take the cart to the pick exception area"
      ],
      "correctOptionIndex": 2,
      "explanation": "Per BBWD-WI-030 §6.6.1, the first step for short inventory is to verify the physical location matches the requested location on the RF Device. You may simply be at the wrong shelf. Only after confirming you're in the right place do you notify the Lead."
    },
    {
      "questionId": "q-003",
      "workflowStep": "EX_DAMAGED_ITEM",
      "sopReference": "BBWD-WI-030 §6.7",
      "questionType": "SCENARIO",
      "difficulty": "INTERMEDIATE",
      "tags": ["exceptions", "damaged-item"],
      "questionText": "You find a damaged, leaking bottle at the Pick Front location. What is the correct procedure?",
      "options": [
        "Place the item in the Amnesty Bin Location immediately",
        "Notify your Lead and leave the item in place",
        "Place the item in a ziplock bag first, then take it to the Amnesty Bin Location",
        "Press CTRL+K to skip the pick and continue"
      ],
      "correctOptionIndex": 2,
      "explanation": "Per BBWD-WI-030 §6.7.2, if a damaged item is leaking or could leak, it must be placed in a ziplock bag PRIOR to placing in the Amnesty Bin Location. This prevents contamination of other items and the bin area."
    }
  ]
}
```

### Question Requirements
- Every question MUST have a `sopReference`
- `explanation` must cite the SOP section
- `SCENARIO` type questions must describe a real workplace situation
- Question banks must have minimum 10 questions
- Each bank must cover at least 3 different `WorkflowStep` values

---

## Directive Schema (`/content/directives/*.md`)

Directives are verbatim SOP reference documents for on-the-job lookup.

```markdown
---
directiveId: dir-001-build-cart
title: Build Cart Procedure
sopDocument: BBWD-WI-030
sopSection: "5.1"
effectiveDate: "2025-01-06"
version: "1.0.0"
relatedLabs: ["lab-01-build-cart-basics"]
relatedSimulations: ["sim-02-new-cart-setup"]
tags: ["build-cart", "setup", "rf-device"]
---

# Build Cart Procedure

**Document:** BBWD-WI-030 | **Effective:** 01/06/2025 | **Owner:** Deane Duggan

## Steps

1. Travel to Command Center.
2. Tasker/CSR will direct you on how many pick totes to acquire.
3. Obtain Pick Cart.
4. Obtain pick totes and load onto cart.
5. Log into RF Device.
6. Type **"1"** (BBWD); press **Enter**.
7. Type **"2"** (Outbound Phase II); press **Enter**.
8. Press **CTRL+T**. Task Group will change (as assigned by Operations); press **Enter** twice.
9. Select Zone Task or Task Group:
   - Task Group corresponds with the number of pick totes being used.
   - Scan the barcode for the Zone or Task Group being used.
   - Scan **"FEX"** for Express orders.
10. Type **"1"** (Make Tote Cart BB); press **Enter**.
11. Scan the Pick Cart barcode.
12. Scan the Pick Tote barcode in the position indicated on the RF Device.
13. Repeat steps 11–12 until all totes have been scanned and assigned to their physical slot.
14. Press **CTRL+E** when all Pick Tote barcodes have been scanned to a slot on the Pick Cart.

## Quick Reference — Keyboard Shortcuts

| Shortcut | Action |
|---------|--------|
| CTRL+T | Change Task Group |
| CTRL+E | Finalize cart build / begin picking |
| CTRL+A | Confirm End Of Tote complete |
| CTRL+W | Go back to previous screen |
| CTRL+K | Skip a pick (exception only) |
```

### Directive Requirements
- Must include frontmatter with all required fields
- Content must match SOP verbatim — no paraphrasing
- Must include `relatedLabs` and `relatedSimulations` cross-links
- Version must be bumped whenever SOP document is updated

---

## Content Naming Conventions

```
labs:           lab-{NN}-{slug}.json           lab-01-build-cart-basics.json
simulations:    sim-{NN}-{slug}.json           sim-01-basic-pick-round.json
question banks: q-bank-{slug}.json             q-bank-keyboard-shortcuts.json
directives:     dir-{NN}-{slug}.md             dir-001-build-cart.md
```

## Content Module Sequence (suggested order for new hires)

```
Week 1, Day 1:   dir-001-build-cart (read)
                 lab-01-build-cart-basics
                 lab-02-pick-basics
                 q-bank-keyboard-shortcuts (quiz)

Week 1, Day 2:   dir-002-picking-standards (read)
                 lab-03-full-pick-round
                 sim-01-basic-pick-round (first scored sim)

Week 1, Day 3:   lab-04-exception-handling
                 dir-003-error-handling (read)
                 q-bank-error-recovery (quiz)
                 sim-02-exceptions-focus

Week 1, Day 4-5: sim-03-full-workflow (advanced)
                 q-bank-workflow (comprehensive quiz)
                 Supervisor sign-off assessment
```
