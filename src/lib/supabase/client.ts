/**
 * src/lib/supabase/client.ts — shared browser-side Supabase client.
 *
 * Returns a single memoized `createBrowserClient` instance for the whole app.
 * Creating a fresh browser client on every render or click is wasteful and can
 * desync auth state across React trees; a module-level singleton avoids that.
 *
 * Per CLAUDE.md §Tech Stack: Supabase Auth (@supabase/ssr split — browser side).
 */
import { createBrowserClient } from "@supabase/ssr"

type BrowserClient = ReturnType<typeof createBrowserClient>

let browserClient: BrowserClient | null = null

/** Get the memoized browser Supabase client, creating it on first use. */
export function getBrowserClient(): BrowserClient {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return browserClient
}
