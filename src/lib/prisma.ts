/**
 * Prisma client singleton for WarehousePro.
 *
 * Per CLAUDE.md §Tech Stack: PostgreSQL via Supabase, Prisma ORM.
 * All DB access flows through this module — never instantiate PrismaClient elsewhere.
 */

import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Singleton Prisma client instance.
 * In development, the client is cached on globalThis to survive HMR restarts.
 */
export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
