import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("production migration contract", () => {
  const migrationsRoot = path.resolve(process.cwd(), "prisma/migrations")

  it("has a PostgreSQL migration lock", () => {
    const lock = readFileSync(path.join(migrationsRoot, "migration_lock.toml"), "utf8")
    expect(lock).toContain('provider = "postgresql"')
  })

  it("contains the required signoff and coaching uniqueness migrations", () => {
    const signoff = path.join(
      migrationsRoot,
      "20260816131500_unique_floor_ready_signoff",
      "migration.sql"
    )
    const coaching = path.join(
      migrationsRoot,
      "20260816143000_unique_open_coaching_flag",
      "migration.sql"
    )

    expect(existsSync(signoff)).toBe(true)
    expect(existsSync(coaching)).toBe(true)
    expect(readFileSync(coaching, "utf8")).toContain("WHERE \"status\" = 'OPEN'")
  })
})
