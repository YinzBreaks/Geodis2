import Link from "next/link"
import { getRoleFromSession } from "@/lib/auth/roles"

/** Feature card data for the landing page. */
const FEATURES: { title: string; description: string; href: string; active: boolean }[] = [
  {
    title: "Simulator",
    description: "Practice RF picking with real error scenarios",
    href: "/sim",
    active: true,
  },
  {
    title: "Floor Readiness",
    description: "Track performance, exceptions, coaching, and signoff",
    href: "/dashboard/trainee",
    active: true,
  },
]

export default async function Home() {
  const { role } = await getRoleFromSession()
  const showSupervisorButton =
    role === "SUPERVISOR" || role === "PICK_LEAD" || role === "WAREHOUSE_MGR"

  return (
    <main className="min-h-screen bg-[var(--color-base)] flex flex-col items-center">
      {/* Feature card hover — CSS-based since this is a server component */}
      <style>{`.feature-card-active:hover { border-left-color: var(--color-amber) !important; background-color: var(--color-surface-2) !important; }`}</style>
      
      {/* ══ HERO ════════════════════════════════════════════════════ */}
      <section className="fade-in-up w-full pt-24 pb-16 px-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
        {/* Signature grid texture */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <h1 className="font-mono font-black text-[clamp(2.5rem,7vw,5.5rem)] text-white tracking-widest leading-none relative uppercase">
          KINETIC OS
        </h1>
        <p className="font-mono text-zinc-400 text-base sm:text-lg mt-3 relative uppercase tracking-wider font-semibold">
          Kinetic Workforce Velocity Platform
        </p>

        {/* SOP badge */}
        <span className="font-mono text-[0.6875rem] text-[var(--color-text-muted)] mt-5 px-3 py-1 border border-[var(--color-border)] rounded-[var(--radius-sm)] relative">
          GEODIS · BBWD-WI-030 · v0.1.0
        </span>

        {/* CTA buttons */}
        <div className="flex gap-3 mt-10 flex-wrap justify-center relative">
          <Link
            href="/sim"
            className="font-display font-bold text-sm tracking-wide bg-[var(--color-amber)] text-[var(--color-base)] px-8 py-3 rounded-[var(--radius-md)] no-underline transition-colors hover:bg-amber-500"
          >
            Start Training →
          </Link>
          {showSupervisorButton && (
          <Link
            href="/dashboard/supervisor"
            className="font-display font-semibold text-sm tracking-wide text-[var(--color-amber)] border border-[var(--color-amber-dim)] px-8 py-3 rounded-[var(--radius-md)] no-underline transition-colors hover:bg-[var(--color-amber)] hover:text-[var(--color-base)]"
          >
            Supervisor Dashboard
          </Link>
          )}
        </div>
      </section>

      {/* ══ FEATURE CARDS ═════════════════════════════════════════════════ */}
      <section className="fade-in-up fade-in-up-2 w-full max-w-4xl px-6 pb-12 grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-4">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-6 shadow-[var(--shadow-card)] transition-colors border-l-[3px] border-l-transparent ${f.active ? 'opacity-100 cursor-pointer feature-card-active' : 'opacity-45 cursor-not-allowed'}`}
          >
            {f.active ? (
              <Link href={f.href} className="no-underline block h-full w-full">
                <p className="font-display font-bold text-sm tracking-wide uppercase text-[var(--color-text-primary)] mb-1.5">
                  {f.title}
                </p>
                <p className="font-ui text-[0.8125rem] text-[var(--color-text-secondary)]">
                  {f.description}
                </p>
              </Link>
            ) : (
              <>
                <p className="font-display font-bold text-sm tracking-wide uppercase text-[var(--color-text-primary)] mb-1.5">
                  {f.title}
                </p>
                <p className="font-ui text-[0.8125rem] text-[var(--color-text-muted)]">
                  {f.description} — Coming Soon
                </p>
              </>
            )}
          </div>
        ))}
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════════════════ */}
      <footer className="fade-in-up fade-in-up-3 mt-auto py-8 px-4 text-center font-mono text-[0.6875rem] text-zinc-500 uppercase tracking-wider">
        GEODIS Tier-1 Certified · Kinetic OS Workforce Velocity Platform · BBWD-WI-030
      </footer>
    </main>
  )
}

