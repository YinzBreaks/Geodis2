/**
 * prisma/seed.ts — Local development seed
 *
 * Creates one user per role plus a trainee with 5 scored sessions.
 * Idempotent: safe to run multiple times (upserts).
 *
 * Requires .env.local with:
 *   DATABASE_URL
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (admin key — never expose to client)
 *
 * Run via: npm run db:seed
 *
 * Per CLAUDE.md §Tech Stack: PostgreSQL via Supabase, Prisma ORM.
 * Per CLAUDE.md §Seed Data: Supabase Auth users + Prisma User records.
 */

import { config } from "dotenv"
import path from "path"
import { PrismaClient } from "@prisma/client"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// ─────────────────────────────────────────────────────────────────────────────
// LOAD ENV
// ─────────────────────────────────────────────────────────────────────────────

config({ path: path.resolve(process.cwd(), ".env.local") })
config({ path: path.resolve(process.cwd(), ".env") }) // fallback

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const FACILITY_ID = "FAC-001"
const DEV_PASSWORD = "dev123"

/** The four seed users. */
const SEED_USERS = [
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
  {
    email: "trainee@geodis.local",
    name: "Tyler Trainee",
    employeeId: "EMP-004",
    role: "TRAINEE" as const,
  },
] as const

// ─────────────────────────────────────────────────────────────────────────────
// SESSION SEED DATA
// Scores: 55 → 63 → 71 → 78 → 82 (improving trend in last 3)
// All 8 exception types covered, all resolved → 100% resolution rate
// Remaining gaps: no ADVANCED pass + only 2 passed sessions → IN_PROGRESS
// ─────────────────────────────────────────────────────────────────────────────

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
    daysAgo: 30,
    totalPicks: 10,
    errors: [
      // WRONG_ITEM × 2, WRONG_TOTE × 1 — all corrected (trainee had help)
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
    daysAgo: 25,
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
    daysAgo: 20,
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
    daysAgo: 10,
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
    daysAgo: 5,
    totalPicks: 20,
    errors: [
      // WRONG_ITEM, WRONG_TOTE — clean performance otherwise
      { errorType: "WRONG_ITEM", injected: true, corrected: true, correctionSteps: ["EX_NOTIFY_LEAD", "EX_PRESS_CTRL_K"] },
      { errorType: "WRONG_TOTE", injected: false, corrected: true, correctionSteps: ["EX_PRESS_CTRL_W"] },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build minimal scanEvents JSON for a session. Each error becomes one
 * non-SUCCESS event; the remaining picks are SUCCESS events.
 * Per SIMULATION.md §ScanEvent shape.
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
  role: string
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
        password: DEV_PASSWORD,
        user_metadata: { role },
        email_confirm: true,
      })
    if (updateError) {
      throw new Error(`Failed to update auth user ${email}: ${updateError.message}`)
    }
    console.log(`  ↺  Auth user updated: ${email}`)
  } else {
    // Create new auth user with role in metadata
    const { error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: DEV_PASSWORD,
        email_confirm: true,
        user_metadata: { role },
      })
    if (createError) {
      throw new Error(`Failed to create auth user ${email}: ${createError.message}`)
    }
    console.log(`  ✓  Auth user created: ${email}`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SEED FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

const prisma = new PrismaClient()

async function main(): Promise<void> {
  // ── Validate environment ───────────────────────────────────────────────────

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error(`
❌  DATABASE_URL is not set.

Add it to your .env.local file:
  DATABASE_URL=postgresql://postgres:[password]@[host]:5432/[database]

(Find this in your Supabase project → Settings → Database → Connection string)
`)
    process.exit(1)
  }

  if (!supabaseUrl || !serviceKey) {
    console.error(`
❌  Supabase environment variables are not set.

Add these to your .env.local file:
  NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...          (Settings → API → anon public)
  SUPABASE_SERVICE_ROLE_KEY=eyJ...              (Settings → API → service_role)
`)
    process.exit(1)
  }

  // ── Supabase admin client ──────────────────────────────────────────────────

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  console.log("\n🌱 WarehousePro — local development seed")
  console.log(`   Facility: ${FACILITY_ID} (Site A)`)
  console.log(`   Supabase: ${supabaseUrl}\n`)

  // ── Step 1: Create Supabase Auth users ────────────────────────────────────

  console.log("1. Creating Supabase auth users…")
  for (const u of SEED_USERS) {
    await upsertAuthUser(supabaseAdmin, u.email, u.role)
  }

  // ── Step 2: Upsert Prisma User records ────────────────────────────────────

  console.log("\n2. Creating Prisma User records…")

  const createdUsers: Record<string, string> = {} // email → Prisma User.id

  for (const u of SEED_USERS) {
    const dbUser = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        role: u.role,
        name: u.name,
        facilityId: FACILITY_ID,
        // Reset assignedTrainees — updated after all users are created
        assignedTrainees: [],
      },
      create: {
        employeeId: u.employeeId,
        name: u.name,
        email: u.email,
        role: u.role,
        facilityId: FACILITY_ID,
        assignedTrainees: [],
      },
    })
    createdUsers[u.email] = dbUser.id
    console.log(`  ✓  User upserted: ${u.email} (id: ${dbUser.id.slice(0, 8)}…)`)
  }

  // ── Step 3: Assign trainee to lead ────────────────────────────────────────

  console.log("\n3. Assigning trainee to lead…")
  const traineeId = createdUsers["trainee@geodis.local"]
  await prisma.user.update({
    where: { email: "lead@geodis.local" },
    data: { assignedTrainees: [traineeId] },
  })
  console.log(`  ✓  lead@geodis.local.assignedTrainees = [${traineeId.slice(0, 8)}…]`)

  // ── Step 4: Create SimSessions for the trainee ────────────────────────────

  console.log("\n4. Creating SimSessions for trainee…")

  // Delete existing sessions to keep seed idempotent
  const deleted = await prisma.simSession.deleteMany({
    where: { userId: traineeId },
  })
  if (deleted.count > 0) {
    console.log(`  ↺  Deleted ${deleted.count} existing session(s)`)
  }

  const now = new Date()

  for (let i = 0; i < TRAINEE_SESSIONS.length; i++) {
    const s = TRAINEE_SESSIONS[i]

    const startedAt = new Date(now)
    startedAt.setDate(startedAt.getDate() - s.daysAgo)
    startedAt.setHours(9, 0, 0, 0) // 9am

    const completedAt = new Date(startedAt)
    completedAt.setMinutes(completedAt.getMinutes() + 35 + i * 3) // 35–47 min sessions

    const totalTimeMs =
      completedAt.getTime() - startedAt.getTime()

    const scanEvents = buildScanEvents(s)
    const replayEvents = scanEvents // replayEvents mirrors scanEvents for the seed

    await prisma.simSession.create({
      data: {
        userId: traineeId,
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
        errors: s.errors,
        replayEvents,
        startedAt,
        completedAt,
        totalTimeMs,
      },
    })

    const scoreLabel = s.passed ? `${s.finalScore} ✓` : `${s.finalScore} ✗`
    console.log(
      `  ✓  Session ${i + 1}/5: ${s.difficulty} "${s.moduleId}" — score ${scoreLabel} — ${s.errors.length} error(s)`
    )
  }

  // ── Step 5: Upsert ModuleProgress for the trainee ─────────────────────────

  console.log("\n5. Upserting ModuleProgress…")

  await prisma.moduleProgress.upsert({
    where: { userId_moduleId: { userId: traineeId, moduleId: "sim-01-beginner" } },
    update: {
      attempts: 3,
      bestScore: 71,
      completed: false,
      lastAttemptAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      timeSpentMs: 3 * 38 * 60 * 1000,
    },
    create: {
      userId: traineeId,
      moduleId: "sim-01-beginner",
      attempts: 3,
      bestScore: 71,
      completed: false,
      lastAttemptAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      timeSpentMs: 3 * 38 * 60 * 1000,
    },
  })
  console.log("  ✓  ModuleProgress: sim-01-beginner (3 attempts, best 71)")

  await prisma.moduleProgress.upsert({
    where: { userId_moduleId: { userId: traineeId, moduleId: "sim-02-intermediate" } },
    update: {
      attempts: 2,
      bestScore: 82,
      completed: true,
      completedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      lastAttemptAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      timeSpentMs: 2 * 40 * 60 * 1000,
    },
    create: {
      userId: traineeId,
      moduleId: "sim-02-intermediate",
      attempts: 2,
      bestScore: 82,
      completed: true,
      completedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      lastAttemptAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      timeSpentMs: 2 * 40 * 60 * 1000,
    },
  })
  console.log("  ✓  ModuleProgress: sim-02-intermediate (2 attempts, best 82, completed)")

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log(`
✅  Seed complete!

Users (password: "${DEV_PASSWORD}" for all):
  supervisor@geodis.local  → SUPERVISOR   (FAC-001)
  lead@geodis.local        → PICK_LEAD    (FAC-001 · assigned Tyler Trainee)
  manager@geodis.local     → WAREHOUSE_MGR (FAC-001)
  trainee@geodis.local     → TRAINEE      (FAC-001 · 5 sessions, scores: 55→63→71→78→82)

Floor-readiness for Tyler Trainee:
  Status:   IN_PROGRESS
  Trend:    improving (71 → 78 → 82)
  Gaps:     ① Only 2 passed sessions (need 3)
            ② No ADVANCED simulation passed
  Coverage: All 8 exception types encountered, 100% resolved

Next steps:
  1. Ensure .env.local has NEXT_PUBLIC_SUPABASE_ANON_KEY set
  2. Run: npm run dev
  3. Open: http://localhost:3005
  4. Log in as supervisor@geodis.local / ${DEV_PASSWORD}
  5. Navigate to /dashboard/supervisor
`)
}

main()
  .catch((err: unknown) => {
    console.error("\n❌  Seed failed:")
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
