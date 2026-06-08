/**
 * prisma/seed.ts â€” Local development seed
 *
 * Creates one user per role plus a trainee with 5 scored sessions.
 * Idempotent: safe to run multiple times (upserts).
 *
 * Requires .env.local with:
 *   DATABASE_URL
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (admin key â€” never expose to client)
 *
 * Run via: npm run db:seed
 *
 * Per CLAUDE.md Â§Tech Stack: PostgreSQL via Supabase, Prisma ORM.
 * Per CLAUDE.md Â§Seed Data: Supabase Auth users + Prisma User records.
 */

import { config } from "dotenv"
import path from "path"
import { PrismaClient } from "@prisma/client"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// LOAD ENV
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

config({ path: path.resolve(process.cwd(), ".env.local") })
config({ path: path.resolve(process.cwd(), ".env") }) // fallback

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CONSTANTS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const FACILITY_ID = "FAC-001"
const DEV_PASSWORD = "dev123"
const TRAINEE_PASSWORD = "train123"

/** Staff seed users (supervisor, lead, manager). Trainees are separate. */
const STAFF_USERS = [
  {
    email: "supervisor@geodis.local",
    name: "Sam Supervisor",
    employeeId: "EMP-001",
    role: "SUPERVISOR" as const,
  },
  {
    email: "lead@geodis.local",
    name: "Laura Lead",
    employeeId: "EMP-002",
    role: "PICK_LEAD" as const,
  },
  {
    email: "manager@geodis.local",
    name: "Marcus Manager",
    employeeId: "EMP-003",
    role: "WAREHOUSE_MGR" as const,
  },
] as const

/** Tyler Trainee â€” keeps backward-compatible email/employeeId from original seed. */
const TYLER_TRAINEE = {
  email: "trainee@geodis.local",
  name: "Tyler Trainee",
  employeeId: "EMP-004",
  role: "TRAINEE" as const,
  password: DEV_PASSWORD,
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SESSION SEED DATA
// Tyler Trainee â€” scores: 55 â†’ 63 â†’ 71 â†’ 78 â†’ 82 (improving trend in last 3)
// Sessions spread over last 14 days (oldest 14d ago, newest today)
// All 8 exception types covered, all resolved â†’ 100% resolution rate
// Remaining gaps: no ADVANCED pass + only 2 passed sessions â†’ IN_PROGRESS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** One SeededSession entry drives a SimSession + ModuleProgress upsert. */
interface SeededSession {
  moduleId: string
  moduleType: string
  difficulty: string
  status: string
  finalScore: number
  accuracyScore: number
  speedScore: number
  passed: boolean
  daysAgo: number
  totalPicks: number
  errors: SessionError[]
}

interface SessionError {
  errorType: string
  injected: boolean
  corrected: boolean
  correctionSteps: string[]
}

const TRAINEE_SESSIONS: SeededSession[] = [
  {
    moduleId: "sim-01-beginner",
    moduleType: "SIMULATION",
    difficulty: "BEGINNER",
    status: "COMPLETED",
    finalScore: 55,
    accuracyScore: 45,
    speedScore: 70,
    passed: false,
    daysAgo: 14,
    totalPicks: 10,
    errors: [
      // WRONG_ITEM Ã— 2, WRONG_TOTE Ã— 1 â€” all corrected (trainee had help)
      { errorType: "WRONG_ITEM", injected: true, corrected: true, correctionSteps: ["EX_NOTIFY_LEAD", "EX_PRESS_CTRL_K"] },
      { errorType: "WRONG_ITEM", injected: false, corrected: true, correctionSteps: ["EX_NOTIFY_LEAD"] },
      { errorType: "WRONG_TOTE", injected: false, corrected: true, correctionSteps: ["EX_PRESS_CTRL_W"] },
    ],
  },
  {
    moduleId: "sim-01-beginner",
    moduleType: "SIMULATION",
    difficulty: "BEGINNER",
    status: "COMPLETED",
    finalScore: 63,
    accuracyScore: 55,
    speedScore: 75,
    passed: false,
    daysAgo: 11,
    totalPicks: 12,
    errors: [
      // WRONG_ITEM, WRONG_LOCATION, ITEM_NOT_FOUND
      { errorType: "WRONG_ITEM", injected: true, corrected: true, correctionSteps: ["EX_NOTIFY_LEAD"] },
      { errorType: "WRONG_LOCATION", injected: false, corrected: true, correctionSteps: ["EX_PRESS_CTRL_W"] },
      { errorType: "ITEM_NOT_FOUND", injected: false, corrected: true, correctionSteps: ["EX_PRESS_CTRL_K"] },
    ],
  },
  {
    moduleId: "sim-01-beginner",
    moduleType: "SIMULATION",
    difficulty: "BEGINNER",
    status: "COMPLETED",
    finalScore: 71,
    accuracyScore: 65,
    speedScore: 80,
    passed: false,
    daysAgo: 7,
    totalPicks: 15,
    errors: [
      // WRONG_TOTE, TOTE_ALLOCATED, CART_ALLOCATED
      { errorType: "WRONG_TOTE", injected: false, corrected: true, correctionSteps: ["EX_PRESS_CTRL_W"] },
      { errorType: "TOTE_ALLOCATED", injected: true, corrected: true, correctionSteps: ["EX_NOTIFY_LEAD"] },
      { errorType: "CART_ALLOCATED", injected: false, corrected: true, correctionSteps: ["EX_NOTIFY_LEAD"] },
    ],
  },
  {
    moduleId: "sim-02-intermediate",
    moduleType: "SIMULATION",
    difficulty: "INTERMEDIATE",
    status: "COMPLETED",
    finalScore: 78,
    accuracyScore: 82,
    speedScore: 72,
    passed: true,
    daysAgo: 4,
    totalPicks: 18,
    errors: [
      // WRONG_LOCATION, ITEM_NOT_FOUND, ITEM_DAMAGED, TIMEOUT
      { errorType: "WRONG_LOCATION", injected: false, corrected: true, correctionSteps: ["EX_PRESS_CTRL_W"] },
      { errorType: "ITEM_NOT_FOUND", injected: true, corrected: true, correctionSteps: ["EX_PRESS_CTRL_K"] },
      { errorType: "ITEM_DAMAGED", injected: false, corrected: true, correctionSteps: ["EX_ITEM_TO_AMNESTY_BIN"] },
      { errorType: "TIMEOUT", injected: false, corrected: true, correctionSteps: ["EX_NOTIFY_LEAD"] },
    ],
  },
  {
    moduleId: "sim-02-intermediate",
    moduleType: "SIMULATION",
    difficulty: "INTERMEDIATE",
    status: "COMPLETED",
    finalScore: 82,
    accuracyScore: 85,
    speedScore: 77,
    passed: true,
    daysAgo: 0,
    totalPicks: 20,
    errors: [
      // WRONG_ITEM, WRONG_TOTE â€” clean performance otherwise
      { errorType: "WRONG_ITEM", injected: true, corrected: true, correctionSteps: ["EX_NOTIFY_LEAD", "EX_PRESS_CTRL_K"] },
      { errorType: "WRONG_TOTE", injected: false, corrected: true, correctionSteps: ["EX_PRESS_CTRL_W"] },
    ],
  },
]

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 11 ADDITIONAL TRAINEE PROFILES (EMP-101 through EMP-111)
// Sessions auto-spread evenly over the last 14 days.
// Error resolution rates:
//   FLOOR_READY profiles:    100% (all corrected)
//   IN_PROGRESS profiles:    70â€“85%
//   NEEDS_COACHING profiles: 30â€“50%
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ProfileError {
  errorType: string
  corrected: boolean
  correctionSteps: string[]
}

interface ProfileSession {
  moduleId: string
  difficulty: string
  finalScore: number
  accuracyScore: number
  speedScore: number
  passed: boolean
  totalPicks: number
  errors: ProfileError[]
}

interface TraineeProfileDef {
  email: string
  name: string
  employeeId: string
  password: string
  sessions: ProfileSession[]
}

const TRAINEE_PROFILES: TraineeProfileDef[] = [
  // â”€â”€ 1. Marcus Webb â€” FLOOR_READY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Scores: 71,74,78,82,87 â€” all 8 exception types, 100% resolution, ADVANCED pass
  {
    email: "marcus.webb@geodis-training.local",
    name: "Marcus Webb",
    employeeId: "EMP-101",
    password: TRAINEE_PASSWORD,
    sessions: [
      { moduleId: "sim-01-beginner",     difficulty: "BEGINNER",      finalScore: 71, accuracyScore: 68, speedScore: 76, passed: false, totalPicks: 10,
        errors: [{ errorType: "WRONG_ITEM",     corrected: true, correctionSteps: ["EX_NOTIFY_LEAD", "EX_PRESS_CTRL_K"] },
                 { errorType: "WRONG_TOTE",     corrected: true, correctionSteps: ["EX_PRESS_CTRL_W"] }] },
      { moduleId: "sim-01-beginner",     difficulty: "BEGINNER",      finalScore: 74, accuracyScore: 73, speedScore: 76, passed: false, totalPicks: 12,
        errors: [{ errorType: "WRONG_LOCATION",  corrected: true, correctionSteps: ["EX_PRESS_CTRL_W"] },
                 { errorType: "ITEM_NOT_FOUND",  corrected: true, correctionSteps: ["EX_PRESS_CTRL_K"] }] },
      { moduleId: "sim-02-intermediate", difficulty: "INTERMEDIATE",  finalScore: 78, accuracyScore: 81, speedScore: 73, passed: true,  totalPicks: 16,
        errors: [{ errorType: "TOTE_ALLOCATED",  corrected: true, correctionSteps: ["EX_NOTIFY_LEAD"] },
                 { errorType: "CART_ALLOCATED",  corrected: true, correctionSteps: ["EX_NOTIFY_LEAD"] }] },
      { moduleId: "sim-02-intermediate", difficulty: "INTERMEDIATE",  finalScore: 82, accuracyScore: 85, speedScore: 77, passed: true,  totalPicks: 18,
        errors: [{ errorType: "ITEM_DAMAGED",    corrected: true, correctionSteps: ["EX_ITEM_TO_AMNESTY_BIN"] },
                 { errorType: "TIMEOUT",          corrected: true, correctionSteps: ["EX_NOTIFY_LEAD"] }] },
      { moduleId: "sim-03-advanced",     difficulty: "ADVANCED",      finalScore: 87, accuracyScore: 88, speedScore: 85, passed: true,  totalPicks: 20,
        errors: [{ errorType: "WRONG_ITEM",      corrected: true, correctionSteps: ["EX_NOTIFY_LEAD", "EX_PRESS_CTRL_K"] },
                 { errorType: "WRONG_TOTE",      corrected: true, correctionSteps: ["EX_PRESS_CTRL_W"] }] },
    ],
  },

  // â”€â”€ 2. Destiny Johnson â€” NEEDS_COACHING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Scores: 45,51,48,53,50 â€” latest 50 < 60 after 5 sessions; resolution 4/10 = 40%
  {
    email: "destiny.johnson@geodis-training.local",
    name: "Destiny Johnson",
    employeeId: "EMP-102",
    password: TRAINEE_PASSWORD,
    sessions: [
      { moduleId: "sim-01-beginner", difficulty: "BEGINNER", finalScore: 45, accuracyScore: 40, speedScore: 52, passed: false, totalPicks: 9,
        errors: [{ errorType: "WRONG_ITEM",     corrected: false, correctionSteps: [] },
                 { errorType: "WRONG_TOTE",     corrected: false, correctionSteps: [] }] },
      { moduleId: "sim-01-beginner", difficulty: "BEGINNER", finalScore: 51, accuracyScore: 47, speedScore: 57, passed: false, totalPicks: 9,
        errors: [{ errorType: "WRONG_ITEM",     corrected: true,  correctionSteps: ["EX_NOTIFY_LEAD"] },
                 { errorType: "WRONG_LOCATION",  corrected: false, correctionSteps: [] }] },
      { moduleId: "sim-01-beginner", difficulty: "BEGINNER", finalScore: 48, accuracyScore: 43, speedScore: 56, passed: false, totalPicks: 9,
        errors: [{ errorType: "ITEM_NOT_FOUND",  corrected: false, correctionSteps: [] },
                 { errorType: "ITEM_DAMAGED",    corrected: false, correctionSteps: [] }] },
      { moduleId: "sim-01-beginner", difficulty: "BEGINNER", finalScore: 53, accuracyScore: 49, speedScore: 59, passed: false, totalPicks: 9,
        errors: [{ errorType: "WRONG_ITEM",      corrected: false, correctionSteps: [] },
                 { errorType: "TOTE_ALLOCATED",  corrected: true,  correctionSteps: ["EX_NOTIFY_LEAD"] }] },
      { moduleId: "sim-01-beginner", difficulty: "BEGINNER", finalScore: 50, accuracyScore: 45, speedScore: 58, passed: false, totalPicks: 9,
        errors: [{ errorType: "WRONG_TOTE",      corrected: false, correctionSteps: [] },
                 { errorType: "CART_ALLOCATED",  corrected: false, correctionSteps: [] }] },
    ],
  },

  // â”€â”€ 3. James Okafor â€” IN_PROGRESS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Scores: 62,68,74,79 â€” improving steadily; missing exception types â†’ IN_PROGRESS
  {
    email: "james.okafor@geodis-training.local",
    name: "James Okafor",
    employeeId: "EMP-103",
    password: TRAINEE_PASSWORD,
    sessions: [
      { moduleId: "sim-01-beginner",     difficulty: "BEGINNER",     finalScore: 62, accuracyScore: 58, speedScore: 68, passed: false, totalPicks: 10,
        errors: [{ errorType: "WRONG_ITEM",    corrected: true,  correctionSteps: ["EX_NOTIFY_LEAD"] },
                 { errorType: "WRONG_TOTE",    corrected: false, correctionSteps: [] }] },
      { moduleId: "sim-01-beginner",     difficulty: "BEGINNER",     finalScore: 68, accuracyScore: 64, speedScore: 74, passed: false, totalPicks: 12,
        errors: [{ errorType: "WRONG_LOCATION",corrected: true,  correctionSteps: ["EX_PRESS_CTRL_W"] },
                 { errorType: "ITEM_NOT_FOUND",corrected: true,  correctionSteps: ["EX_PRESS_CTRL_K"] }] },
      { moduleId: "sim-02-intermediate", difficulty: "INTERMEDIATE", finalScore: 74, accuracyScore: 77, speedScore: 69, passed: false, totalPicks: 16,
        errors: [{ errorType: "ITEM_DAMAGED",  corrected: true,  correctionSteps: ["EX_ITEM_TO_AMNESTY_BIN"] },
                 { errorType: "WRONG_ITEM",    corrected: false, correctionSteps: [] }] },
      { moduleId: "sim-02-intermediate", difficulty: "INTERMEDIATE", finalScore: 79, accuracyScore: 82, speedScore: 74, passed: true,  totalPicks: 18,
        errors: [{ errorType: "WRONG_TOTE",    corrected: true,  correctionSteps: ["EX_PRESS_CTRL_W"] },
                 { errorType: "WRONG_LOCATION",corrected: true,  correctionSteps: ["EX_PRESS_CTRL_W"] }] },
    ],
  },

  // â”€â”€ 4. Priya Patel â€” FLOOR_READY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Scores: 80,85,88,91,93 â€” high performer, all 8 types, 100% resolution
  {
    email: "priya.patel@geodis-training.local",
    name: "Priya Patel",
    employeeId: "EMP-104",
    password: TRAINEE_PASSWORD,
    sessions: [
      { moduleId: "sim-02-intermediate", difficulty: "INTERMEDIATE", finalScore: 80, accuracyScore: 83, speedScore: 75, passed: true, totalPicks: 16,
        errors: [{ errorType: "WRONG_ITEM",    corrected: true, correctionSteps: ["EX_NOTIFY_LEAD"] },
                 { errorType: "WRONG_TOTE",    corrected: true, correctionSteps: ["EX_PRESS_CTRL_W"] }] },
      { moduleId: "sim-02-intermediate", difficulty: "INTERMEDIATE", finalScore: 85, accuracyScore: 87, speedScore: 81, passed: true, totalPicks: 18,
        errors: [{ errorType: "WRONG_LOCATION",corrected: true, correctionSteps: ["EX_PRESS_CTRL_W"] },
                 { errorType: "TOTE_ALLOCATED",corrected: true, correctionSteps: ["EX_NOTIFY_LEAD"] }] },
      { moduleId: "sim-02-intermediate", difficulty: "INTERMEDIATE", finalScore: 88, accuracyScore: 90, speedScore: 85, passed: true, totalPicks: 20,
        errors: [{ errorType: "CART_ALLOCATED",corrected: true, correctionSteps: ["EX_NOTIFY_LEAD"] },
                 { errorType: "ITEM_NOT_FOUND",corrected: true, correctionSteps: ["EX_PRESS_CTRL_K"] }] },
      { moduleId: "sim-03-advanced",     difficulty: "ADVANCED",     finalScore: 91, accuracyScore: 92, speedScore: 89, passed: true, totalPicks: 20,
        errors: [{ errorType: "ITEM_DAMAGED",  corrected: true, correctionSteps: ["EX_ITEM_TO_AMNESTY_BIN"] },
                 { errorType: "TIMEOUT",        corrected: true, correctionSteps: ["EX_NOTIFY_LEAD"] }] },
      { moduleId: "sim-03-advanced",     difficulty: "ADVANCED",     finalScore: 93, accuracyScore: 94, speedScore: 91, passed: true, totalPicks: 20,
        errors: [{ errorType: "WRONG_ITEM",    corrected: true, correctionSteps: ["EX_NOTIFY_LEAD"] },
                 { errorType: "WRONG_TOTE",    corrected: true, correctionSteps: ["EX_PRESS_CTRL_W"] }] },
    ],
  },

  // â”€â”€ 5. Carlos Mendez â€” IN_PROGRESS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Scores: 55,60,65 â€” 3 sessions, early, improving
  {
    email: "carlos.mendez@geodis-training.local",
    name: "Carlos Mendez",
    employeeId: "EMP-105",
    password: TRAINEE_PASSWORD,
    sessions: [
      { moduleId: "sim-01-beginner", difficulty: "BEGINNER", finalScore: 55, accuracyScore: 50, speedScore: 63, passed: false, totalPicks: 9,
        errors: [{ errorType: "WRONG_ITEM",    corrected: true,  correctionSteps: ["EX_NOTIFY_LEAD"] },
                 { errorType: "WRONG_TOTE",    corrected: false, correctionSteps: [] }] },
      { moduleId: "sim-01-beginner", difficulty: "BEGINNER", finalScore: 60, accuracyScore: 56, speedScore: 67, passed: false, totalPicks: 10,
        errors: [{ errorType: "WRONG_LOCATION",corrected: true,  correctionSteps: ["EX_PRESS_CTRL_W"] },
                 { errorType: "ITEM_NOT_FOUND",corrected: true,  correctionSteps: ["EX_PRESS_CTRL_K"] }] },
      { moduleId: "sim-01-beginner", difficulty: "BEGINNER", finalScore: 65, accuracyScore: 62, speedScore: 71, passed: false, totalPicks: 12,
        errors: [{ errorType: "WRONG_ITEM",    corrected: true,  correctionSteps: ["EX_NOTIFY_LEAD"] },
                 { errorType: "ITEM_DAMAGED",  corrected: false, correctionSteps: [] }] },
    ],
  },

  // â”€â”€ 6. Aisha Williams â€” NEEDS_COACHING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Scores: 70,68,65,62 â€” declining trend â†’ NEEDS_COACHING
  {
    email: "aisha.williams@geodis-training.local",
    name: "Aisha Williams",
    employeeId: "EMP-106",
    password: TRAINEE_PASSWORD,
    sessions: [
      { moduleId: "sim-02-intermediate", difficulty: "INTERMEDIATE", finalScore: 70, accuracyScore: 67, speedScore: 75, passed: false, totalPicks: 16,
        errors: [{ errorType: "WRONG_ITEM",    corrected: true,  correctionSteps: ["EX_NOTIFY_LEAD"] },
                 { errorType: "WRONG_TOTE",    corrected: true,  correctionSteps: ["EX_PRESS_CTRL_W"] }] },
      { moduleId: "sim-02-intermediate", difficulty: "INTERMEDIATE", finalScore: 68, accuracyScore: 65, speedScore: 73, passed: false, totalPicks: 16,
        errors: [{ errorType: "WRONG_LOCATION",corrected: false, correctionSteps: [] },
                 { errorType: "ITEM_NOT_FOUND",corrected: true,  correctionSteps: ["EX_PRESS_CTRL_K"] }] },
      { moduleId: "sim-02-intermediate", difficulty: "INTERMEDIATE", finalScore: 65, accuracyScore: 61, speedScore: 71, passed: false, totalPicks: 16,
        errors: [{ errorType: "ITEM_DAMAGED",  corrected: false, correctionSteps: [] },
                 { errorType: "WRONG_ITEM",    corrected: false, correctionSteps: [] }] },
      { moduleId: "sim-02-intermediate", difficulty: "INTERMEDIATE", finalScore: 62, accuracyScore: 58, speedScore: 68, passed: false, totalPicks: 16,
        errors: [{ errorType: "WRONG_TOTE",    corrected: false, correctionSteps: [] },
                 { errorType: "TOTE_ALLOCATED",corrected: false, correctionSteps: [] }] },
    ],
  },

  // â”€â”€ 7. Devon Parker â€” IN_PROGRESS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Scores: 73,76 â€” 2 sessions, close to passing
  {
    email: "devon.parker@geodis-training.local",
    name: "Devon Parker",
    employeeId: "EMP-107",
    password: TRAINEE_PASSWORD,
    sessions: [
      { moduleId: "sim-02-intermediate", difficulty: "INTERMEDIATE", finalScore: 73, accuracyScore: 70, speedScore: 78, passed: false, totalPicks: 16,
        errors: [{ errorType: "WRONG_ITEM",    corrected: true, correctionSteps: ["EX_NOTIFY_LEAD"] },
                 { errorType: "WRONG_TOTE",    corrected: true, correctionSteps: ["EX_PRESS_CTRL_W"] }] },
      { moduleId: "sim-02-intermediate", difficulty: "INTERMEDIATE", finalScore: 76, accuracyScore: 79, speedScore: 71, passed: true,  totalPicks: 18,
        errors: [{ errorType: "WRONG_LOCATION",corrected: true, correctionSteps: ["EX_PRESS_CTRL_W"] },
                 { errorType: "ITEM_NOT_FOUND",corrected: true, correctionSteps: ["EX_PRESS_CTRL_K"] }] },
    ],
  },

  // â”€â”€ 8. Samantha Cruz â€” FLOOR_READY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Scores: 76,79,83,88 â€” consistent passer, all 8 types covered, ADVANCED pass
  {
    email: "samantha.cruz@geodis-training.local",
    name: "Samantha Cruz",
    employeeId: "EMP-108",
    password: TRAINEE_PASSWORD,
    sessions: [
      { moduleId: "sim-02-intermediate", difficulty: "INTERMEDIATE", finalScore: 76, accuracyScore: 80, speedScore: 70, passed: true, totalPicks: 16,
        errors: [{ errorType: "WRONG_ITEM",    corrected: true, correctionSteps: ["EX_NOTIFY_LEAD"] },
                 { errorType: "WRONG_TOTE",    corrected: true, correctionSteps: ["EX_PRESS_CTRL_W"] },
                 { errorType: "WRONG_LOCATION",corrected: true, correctionSteps: ["EX_PRESS_CTRL_W"] }] },
      { moduleId: "sim-02-intermediate", difficulty: "INTERMEDIATE", finalScore: 79, accuracyScore: 82, speedScore: 74, passed: true, totalPicks: 18,
        errors: [{ errorType: "TOTE_ALLOCATED",corrected: true, correctionSteps: ["EX_NOTIFY_LEAD"] },
                 { errorType: "CART_ALLOCATED",corrected: true, correctionSteps: ["EX_NOTIFY_LEAD"] },
                 { errorType: "ITEM_NOT_FOUND",corrected: true, correctionSteps: ["EX_PRESS_CTRL_K"] }] },
      { moduleId: "sim-02-intermediate", difficulty: "INTERMEDIATE", finalScore: 83, accuracyScore: 86, speedScore: 78, passed: true, totalPicks: 20,
        errors: [{ errorType: "ITEM_DAMAGED",  corrected: true, correctionSteps: ["EX_ITEM_TO_AMNESTY_BIN"] },
                 { errorType: "TIMEOUT",        corrected: true, correctionSteps: ["EX_NOTIFY_LEAD"] }] },
      { moduleId: "sim-03-advanced",     difficulty: "ADVANCED",     finalScore: 88, accuracyScore: 90, speedScore: 84, passed: true, totalPicks: 20,
        errors: [{ errorType: "WRONG_ITEM",    corrected: true, correctionSteps: ["EX_NOTIFY_LEAD"] },
                 { errorType: "WRONG_TOTE",    corrected: true, correctionSteps: ["EX_PRESS_CTRL_W"] }] },
    ],
  },

  // â”€â”€ 9. Jamal Thompson â€” NEEDS_COACHING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Scores: 40,44,42 â€” latest 42 < 60 after 3 sessions â†’ NEEDS_COACHING
  {
    email: "jamal.thompson@geodis-training.local",
    name: "Jamal Thompson",
    employeeId: "EMP-109",
    password: TRAINEE_PASSWORD,
    sessions: [
      { moduleId: "sim-01-beginner", difficulty: "BEGINNER", finalScore: 40, accuracyScore: 36, speedScore: 47, passed: false, totalPicks: 9,
        errors: [{ errorType: "WRONG_ITEM",    corrected: false, correctionSteps: [] },
                 { errorType: "WRONG_TOTE",    corrected: false, correctionSteps: [] }] },
      { moduleId: "sim-01-beginner", difficulty: "BEGINNER", finalScore: 44, accuracyScore: 40, speedScore: 51, passed: false, totalPicks: 9,
        errors: [{ errorType: "WRONG_LOCATION",corrected: false, correctionSteps: [] },
                 { errorType: "ITEM_NOT_FOUND",corrected: true,  correctionSteps: ["EX_PRESS_CTRL_K"] }] },
      { moduleId: "sim-01-beginner", difficulty: "BEGINNER", finalScore: 42, accuracyScore: 38, speedScore: 49, passed: false, totalPicks: 9,
        errors: [{ errorType: "ITEM_DAMAGED",  corrected: false, correctionSteps: [] },
                 { errorType: "WRONG_ITEM",    corrected: false, correctionSteps: [] }] },
    ],
  },

  // â”€â”€ 10. Rachel Kim â€” IN_PROGRESS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Scores: 67,72,77,80 â€” approaching floor-ready, 2 passes, improving
  {
    email: "rachel.kim@geodis-training.local",
    name: "Rachel Kim",
    employeeId: "EMP-110",
    password: TRAINEE_PASSWORD,
    sessions: [
      { moduleId: "sim-01-beginner",     difficulty: "BEGINNER",     finalScore: 67, accuracyScore: 63, speedScore: 73, passed: false, totalPicks: 12,
        errors: [{ errorType: "WRONG_ITEM",    corrected: true,  correctionSteps: ["EX_NOTIFY_LEAD"] },
                 { errorType: "WRONG_TOTE",    corrected: true,  correctionSteps: ["EX_PRESS_CTRL_W"] }] },
      { moduleId: "sim-02-intermediate", difficulty: "INTERMEDIATE", finalScore: 72, accuracyScore: 68, speedScore: 78, passed: false, totalPicks: 14,
        errors: [{ errorType: "WRONG_LOCATION",corrected: true,  correctionSteps: ["EX_PRESS_CTRL_W"] },
                 { errorType: "ITEM_NOT_FOUND",corrected: true,  correctionSteps: ["EX_PRESS_CTRL_K"] }] },
      { moduleId: "sim-02-intermediate", difficulty: "INTERMEDIATE", finalScore: 77, accuracyScore: 80, speedScore: 72, passed: true,  totalPicks: 16,
        errors: [{ errorType: "ITEM_DAMAGED",  corrected: true,  correctionSteps: ["EX_ITEM_TO_AMNESTY_BIN"] },
                 { errorType: "WRONG_ITEM",    corrected: false, correctionSteps: [] }] },
      { moduleId: "sim-02-intermediate", difficulty: "INTERMEDIATE", finalScore: 80, accuracyScore: 83, speedScore: 75, passed: true,  totalPicks: 18,
        errors: [{ errorType: "WRONG_TOTE",    corrected: true,  correctionSteps: ["EX_PRESS_CTRL_W"] },
                 { errorType: "TOTE_ALLOCATED",corrected: true,  correctionSteps: ["EX_NOTIFY_LEAD"] }] },
    ],
  },

  // â”€â”€ 11. Brandon Foster â€” IN_PROGRESS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Scores: 58,64,70 â€” slow improver, 3 sessions, no passes yet
  {
    email: "brandon.foster@geodis-training.local",
    name: "Brandon Foster",
    employeeId: "EMP-111",
    password: TRAINEE_PASSWORD,
    sessions: [
      { moduleId: "sim-01-beginner", difficulty: "BEGINNER", finalScore: 58, accuracyScore: 53, speedScore: 66, passed: false, totalPicks: 9,
        errors: [{ errorType: "WRONG_ITEM",    corrected: true,  correctionSteps: ["EX_NOTIFY_LEAD"] },
                 { errorType: "WRONG_TOTE",    corrected: false, correctionSteps: [] }] },
      { moduleId: "sim-01-beginner", difficulty: "BEGINNER", finalScore: 64, accuracyScore: 60, speedScore: 71, passed: false, totalPicks: 11,
        errors: [{ errorType: "WRONG_LOCATION",corrected: true,  correctionSteps: ["EX_PRESS_CTRL_W"] },
                 { errorType: "ITEM_DAMAGED",  corrected: true,  correctionSteps: ["EX_ITEM_TO_AMNESTY_BIN"] }] },
      { moduleId: "sim-01-beginner", difficulty: "BEGINNER", finalScore: 70, accuracyScore: 67, speedScore: 76, passed: false, totalPicks: 13,
        errors: [{ errorType: "ITEM_NOT_FOUND",corrected: true,  correctionSteps: ["EX_PRESS_CTRL_K"] },
                 { errorType: "WRONG_ITEM",    corrected: false, correctionSteps: [] }] },
    ],
  },
]

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// HELPERS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Build minimal scanEvents JSON for a session. Each error becomes one
 * non-SUCCESS event; the remaining picks are SUCCESS events.
 * Per SIMULATION.md Â§ScanEvent shape.
 */
function buildScanEvents(
  session: SeededSession
): Array<{
  step: string
  expectedValue: string
  scannedValue: string
  result: string
  responseTimeMs: number
}> {
  const events: Array<{
    step: string
    expectedValue: string
    scannedValue: string
    result: string
    responseTimeMs: number
  }> = []

  // Add successful picks
  for (let i = 0; i < session.totalPicks; i++) {
    events.push({
      step: "PK_SCAN_ITEM_UPC",
      expectedValue: `UPC-${String(i + 1).padStart(3, "0")}`,
      scannedValue: `UPC-${String(i + 1).padStart(3, "0")}`,
      result: "SUCCESS",
      responseTimeMs: 1200 + Math.floor(Math.random() * 800),
    })
  }

  // Add error events (one per error entry)
  for (const err of session.errors) {
    events.push({
      step: errorTypeToStep(err.errorType),
      expectedValue: "EXPECTED-BARCODE",
      scannedValue: "WRONG-BARCODE",
      result: err.errorType,
      responseTimeMs: 2500 + Math.floor(Math.random() * 2000),
    })
  }

  return events
}

/** Map error type to the relevant WorkflowStep. */
function errorTypeToStep(errorType: string): string {
  const map: Record<string, string> = {
    WRONG_ITEM: "PK_SCAN_ITEM_UPC",
    WRONG_TOTE: "PK_SCAN_TOTE_BARCODE",
    WRONG_LOCATION: "PK_VERIFY_LOCATION",
    TOTE_ALLOCATED: "BC_SCAN_TOTE_BARCODE",
    CART_ALLOCATED: "BC_SCAN_CART_BARCODE",
    ITEM_NOT_FOUND: "PK_SCAN_ITEM_UPC",
    ITEM_DAMAGED: "PK_VERIFY_ITEM",
    TIMEOUT: "PK_SCAN_ITEM_UPC",
  }
  return map[errorType] ?? "PK_SCAN_ITEM_UPC"
}

/**
 * Upsert a Supabase auth user (create or update metadata + password).
 * Uses admin API; idempotent.
 */
async function upsertAuthUser(
  supabaseAdmin: SupabaseClient,
  email: string,
  role: string,
  password: string = DEV_PASSWORD
): Promise<void> {
  // List all users to check if this email already exists
  const { data: listData, error: listError } =
    await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })

  if (listError) {
    throw new Error(`Failed to list auth users: ${listError.message}`)
  }

  const existing = listData.users.find((u) => u.email === email)

  if (existing) {
    // Update password and metadata to match seed values
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password,
        user_metadata: { role },
        email_confirm: true,
      })
    if (updateError) {
      throw new Error(`Failed to update auth user ${email}: ${updateError.message}`)
    }
    console.log(`  â†º  Auth user updated: ${email}`)
  } else {
    // Create new auth user with role in metadata
    const { error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role },
      })
    if (createError) {
      throw new Error(`Failed to create auth user ${email}: ${createError.message}`)
    }
    console.log(`  âœ“  Auth user created: ${email}`)
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MAIN SEED FUNCTION
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const prisma = new PrismaClient()

async function main(): Promise<void> {
  // â”€â”€ Validate environment â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error(`\nâŒ  DATABASE_URL is not set.\n\nAdd it to your .env.local file:\n  DATABASE_URL=postgresql://...\n`)
    process.exit(1)
  }
  if (!supabaseUrl || !serviceKey) {
    console.error(`\nâŒ  Supabase environment variables are not set.\n\nAdd to .env.local:\n  NEXT_PUBLIC_SUPABASE_URL=...\n  SUPABASE_SERVICE_ROLE_KEY=...\n`)
    process.exit(1)
  }

  // â”€â”€ Supabase admin client â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log("\nðŸŒ± WarehousePro â€” local development seed")
  console.log(`   Facility: ${FACILITY_ID}  |  3 staff + 12 trainees`)
  console.log(`   Supabase: ${supabaseUrl}\n`)

  // â”€â”€ Step 1: Create Supabase Auth users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  console.log("1. Creating Supabase auth usersâ€¦")
  for (const u of STAFF_USERS) {
    await upsertAuthUser(supabaseAdmin, u.email, u.role, DEV_PASSWORD)
  }
  await upsertAuthUser(supabaseAdmin, TYLER_TRAINEE.email, TYLER_TRAINEE.role, DEV_PASSWORD)
  for (const p of TRAINEE_PROFILES) {
    await upsertAuthUser(supabaseAdmin, p.email, "TRAINEE", p.password)
  }

  // â”€â”€ Step 2: Upsert Prisma User records â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  console.log("\n2. Upserting Prisma User recordsâ€¦")
  const createdUsers: Record<string, string> = {} // email â†’ Prisma User.id

  for (const u of STAFF_USERS) {
    const dbUser = await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, name: u.name, facilityId: FACILITY_ID, assignedTrainees: [] },
      create: { employeeId: u.employeeId, name: u.name, email: u.email, role: u.role, facilityId: FACILITY_ID, assignedTrainees: [] },
    })
    createdUsers[u.email] = dbUser.id
    console.log(`  âœ“  ${u.email}`)
  }

  // Tyler Trainee (original seed user)
  const tylerUser = await prisma.user.upsert({
    where: { email: TYLER_TRAINEE.email },
    update: { role: TYLER_TRAINEE.role, name: TYLER_TRAINEE.name, facilityId: FACILITY_ID },
    create: { employeeId: TYLER_TRAINEE.employeeId, name: TYLER_TRAINEE.name, email: TYLER_TRAINEE.email, role: TYLER_TRAINEE.role, facilityId: FACILITY_ID, assignedTrainees: [] },
  })
  createdUsers[TYLER_TRAINEE.email] = tylerUser.id
  console.log(`  âœ“  ${TYLER_TRAINEE.email}`)

  // 11 additional profile trainees
  for (const p of TRAINEE_PROFILES) {
    const dbUser = await prisma.user.upsert({
      where: { email: p.email },
      update: { role: "TRAINEE", name: p.name, facilityId: FACILITY_ID },
      create: { employeeId: p.employeeId, name: p.name, email: p.email, role: "TRAINEE", facilityId: FACILITY_ID, assignedTrainees: [] },
    })
    createdUsers[p.email] = dbUser.id
    console.log(`  âœ“  ${p.email}`)
  }

  // â”€â”€ Step 3: Assign lead's trainees â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // Per task spec: lead gets Marcus Webb, Destiny Johnson, James Okafor
  console.log("\n3. Assigning trainees to leadâ€¦")
  const leadAssigned = [
    createdUsers["marcus.webb@geodis-training.local"],
    createdUsers["destiny.johnson@geodis-training.local"],
    createdUsers["james.okafor@geodis-training.local"],
  ].filter((id): id is string => Boolean(id))
  await prisma.user.update({
    where: { email: "lead@geodis.local" },
    data: { assignedTrainees: leadAssigned },
  })
  console.log(`  âœ“  lead â†’ Marcus Webb, Destiny Johnson, James Okafor`)

  // â”€â”€ Step 4: SimSessions for Tyler Trainee â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  console.log("\n4. Creating sessions for Tyler Traineeâ€¦")
  const tylerDeleted = await prisma.simSession.deleteMany({ where: { userId: tylerUser.id } })
  if (tylerDeleted.count > 0) console.log(`  â†º  Deleted ${tylerDeleted.count} existing session(s)`)

  const now = new Date()

  for (let i = 0; i < TRAINEE_SESSIONS.length; i++) {
    const s = TRAINEE_SESSIONS[i]
    const startedAt = new Date(now)
    startedAt.setDate(startedAt.getDate() - s.daysAgo)
    startedAt.setHours(9, 0, 0, 0)
    const completedAt = new Date(startedAt)
    completedAt.setMinutes(completedAt.getMinutes() + 35 + i * 3)
    const totalTimeMs = completedAt.getTime() - startedAt.getTime()
    const scanEvents = buildScanEvents(s)
    await prisma.simSession.create({
      data: {
        userId: tylerUser.id,
        moduleId: s.moduleId,
        moduleType: s.moduleType,
        difficulty: s.difficulty,
        status: s.status,
        finalScore: s.finalScore,
        accuracyScore: s.accuracyScore,
        speedScore: s.speedScore,
        passed: s.passed,
        totalPicks: s.totalPicks,
        errorCount: s.errors.length,
        scanEvents,
        errors: JSON.parse(JSON.stringify(s.errors)),
        replayEvents: scanEvents,
        startedAt,
        completedAt,
        totalTimeMs,
      },
    })
    console.log(`  âœ“  Session ${i + 1}/${TRAINEE_SESSIONS.length}: ${s.difficulty} score ${s.finalScore}${s.passed ? " âœ“" : " âœ—"}`)
  }

  // â”€â”€ Step 5: SimSessions for profile trainees â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  console.log("\n5. Creating sessions for 11 trainee profilesâ€¦")

  for (const profile of TRAINEE_PROFILES) {
    const profileUserId = createdUsers[profile.email]
    const deleted = await prisma.simSession.deleteMany({ where: { userId: profileUserId } })
    if (deleted.count > 0) console.log(`  â†º  ${profile.name}: deleted ${deleted.count} session(s)`)

    const n = profile.sessions.length
    for (let i = 0; i < n; i++) {
      const sess = profile.sessions[i]
      // Spread sessions evenly over last 14 days: oldest = 14d ago, newest = today
      const daysAgo = n === 1 ? 0 : Math.round(14 - (i * 14) / (n - 1))
      const startedAt = new Date(now)
      startedAt.setDate(startedAt.getDate() - daysAgo)
      startedAt.setHours(9 + (i % 4), 0, 0, 0)
      const completedAt = new Date(startedAt)
      completedAt.setMinutes(completedAt.getMinutes() + 30 + i * 5)
      const totalTimeMs = completedAt.getTime() - startedAt.getTime()

      // Convert ProfileError â†’ SessionError for buildScanEvents compatibility
      const seededErrors: SessionError[] = sess.errors.map((e) => ({
        errorType: e.errorType,
        injected: false,
        corrected: e.corrected,
        correctionSteps: e.correctionSteps,
      }))

      const scanEvents = buildScanEvents({
        moduleId: sess.moduleId,
        moduleType: "SIMULATION",
        difficulty: sess.difficulty,
        status: "COMPLETED",
        finalScore: sess.finalScore,
        accuracyScore: sess.accuracyScore,
        speedScore: sess.speedScore,
        passed: sess.passed,
        daysAgo,
        totalPicks: sess.totalPicks,
        errors: seededErrors,
      })

      await prisma.simSession.create({
        data: {
          userId: profileUserId,
          moduleId: sess.moduleId,
          moduleType: "SIMULATION",
          difficulty: sess.difficulty,
          status: "COMPLETED",
          finalScore: sess.finalScore,
          accuracyScore: sess.accuracyScore,
          speedScore: sess.speedScore,
          passed: sess.passed,
          totalPicks: sess.totalPicks,
          errorCount: sess.errors.length,
          scanEvents,
          errors: JSON.parse(JSON.stringify(seededErrors)),
          replayEvents: scanEvents,
          startedAt,
          completedAt,
          totalTimeMs,
        },
      })
    }

    const scores = profile.sessions.map((s) => s.finalScore).join("â†’")
    console.log(`  âœ“  ${profile.name.padEnd(20)} ${n} session(s) â€” scores: ${scores}`)
  }

  // â”€â”€ Step 6: ModuleProgress â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  console.log("\n6. Upserting ModuleProgressâ€¦")

  // Tyler Trainee
  const tylerNow = now
  await prisma.moduleProgress.upsert({
    where: { userId_moduleId: { userId: tylerUser.id, moduleId: "sim-01-beginner" } },
    update: { attempts: 3, bestScore: 71, completed: false, lastAttemptAt: new Date(tylerNow.getTime() - 7 * 24 * 60 * 60 * 1000), timeSpentMs: 3 * 38 * 60 * 1000 },
    create: { userId: tylerUser.id, moduleId: "sim-01-beginner", attempts: 3, bestScore: 71, completed: false, lastAttemptAt: new Date(tylerNow.getTime() - 7 * 24 * 60 * 60 * 1000), timeSpentMs: 3 * 38 * 60 * 1000 },
  })
  await prisma.moduleProgress.upsert({
    where: { userId_moduleId: { userId: tylerUser.id, moduleId: "sim-02-intermediate" } },
    update: { attempts: 2, bestScore: 82, completed: true, completedAt: new Date(tylerNow.getTime() - 0), lastAttemptAt: new Date(tylerNow.getTime() - 0), timeSpentMs: 2 * 40 * 60 * 1000 },
    create: { userId: tylerUser.id, moduleId: "sim-02-intermediate", attempts: 2, bestScore: 82, completed: true, completedAt: new Date(tylerNow.getTime() - 0), lastAttemptAt: new Date(tylerNow.getTime() - 0), timeSpentMs: 2 * 40 * 60 * 1000 },
  })
  console.log("  âœ“  Tyler Trainee")

  // Profile trainees â€” compute from their session data
  for (const profile of TRAINEE_PROFILES) {
    const profileUserId = createdUsers[profile.email]
    const n = profile.sessions.length

    // Group by moduleId
    const moduleMap: Record<string, { attempts: number; bestScore: number; passed: boolean; lastDaysAgo: number }> = {}
    for (let i = 0; i < n; i++) {
      const sess = profile.sessions[i]
      const daysAgo = n === 1 ? 0 : Math.round(14 - (i * 14) / (n - 1))
      if (!moduleMap[sess.moduleId]) {
        moduleMap[sess.moduleId] = { attempts: 0, bestScore: 0, passed: false, lastDaysAgo: 99 }
      }
      moduleMap[sess.moduleId].attempts += 1
      moduleMap[sess.moduleId].bestScore = Math.max(moduleMap[sess.moduleId].bestScore, sess.finalScore)
      if (sess.passed) moduleMap[sess.moduleId].passed = true
      if (daysAgo < moduleMap[sess.moduleId].lastDaysAgo) {
        moduleMap[sess.moduleId].lastDaysAgo = daysAgo
      }
    }

    for (const [moduleId, stats] of Object.entries(moduleMap)) {
      const lastAttemptAt = new Date(now.getTime() - stats.lastDaysAgo * 24 * 60 * 60 * 1000)
      await prisma.moduleProgress.upsert({
        where: { userId_moduleId: { userId: profileUserId, moduleId } },
        update: { attempts: stats.attempts, bestScore: stats.bestScore, completed: stats.passed, lastAttemptAt },
        create: { userId: profileUserId, moduleId, attempts: stats.attempts, bestScore: stats.bestScore, completed: stats.passed, lastAttemptAt },
      })
    }
  }
  console.log("  âœ“  All trainee ModuleProgress records")

  // â”€â”€ Summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  console.log(`
âœ…  Seed complete!

Staff accounts (password: "${DEV_PASSWORD}"):
  supervisor@geodis.local   â†’ SUPERVISOR    (FAC-001)
  lead@geodis.local         â†’ PICK_LEAD     (FAC-001 Â· assigned Marcus, Destiny, James)
  manager@geodis.local      â†’ WAREHOUSE_MGR (FAC-001)

Trainee accounts (password: "${TRAINEE_PASSWORD}" except Tyler â†’ "${DEV_PASSWORD}"):
  trainee@geodis.local                  Tyler Trainee    EMP-004  IN_PROGRESS    (55â†’82)
  marcus.webb@geodis-training.local     Marcus Webb      EMP-101  FLOOR_READY    (71â†’87)
  destiny.johnson@geodis-training.local Destiny Johnson  EMP-102  NEEDS_COACHING (45â†’50)
  james.okafor@geodis-training.local    James Okafor     EMP-103  IN_PROGRESS    (62â†’79)
  priya.patel@geodis-training.local     Priya Patel      EMP-104  FLOOR_READY    (80â†’93)
  carlos.mendez@geodis-training.local   Carlos Mendez    EMP-105  IN_PROGRESS    (55â†’65)
  aisha.williams@geodis-training.local  Aisha Williams   EMP-106  NEEDS_COACHING (70â†’62, declining)
  devon.parker@geodis-training.local    Devon Parker     EMP-107  IN_PROGRESS    (73â†’76)
  samantha.cruz@geodis-training.local   Samantha Cruz    EMP-108  FLOOR_READY    (76â†’88)
  jamal.thompson@geodis-training.local  Jamal Thompson   EMP-109  NEEDS_COACHING (40â†’42)
  rachel.kim@geodis-training.local      Rachel Kim       EMP-110  IN_PROGRESS    (67â†’80)
  brandon.foster@geodis-training.local  Brandon Foster   EMP-111  IN_PROGRESS    (58â†’70)

NEEDS ATTENTION:
  Destiny Johnson  â€” Scores below 60 after 3+ attempts
  Aisha Williams   â€” Score declining across last 3 sessions
  Jamal Thompson   â€” Scores below 60 after 3+ attempts

Next steps:
  1. Run: npm run dev
  2. Open: http://localhost:3005
  3. Log in as supervisor@geodis.local / ${DEV_PASSWORD}
  4. Navigate to /dashboard/supervisor
`)
}

main()
  .catch((err: unknown) => {
    console.error("\nâŒ  Seed failed:")
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
