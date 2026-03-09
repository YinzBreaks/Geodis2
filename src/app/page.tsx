"use client"

import Link from "next/link"

/** Feature card data for the landing page. */
const FEATURES: { title: string; description: string; href: string; active: boolean }[] = [
  {
    title: "Simulator",
    description: "Practice RF picking with real error scenarios",
    href: "/sim",
    active: true,
  },
  {
    title: "Labs",
    description: "Step-by-step guided lessons",
    href: "#",
    active: false,
  },
  {
    title: "Quiz Bank",
    description: "Test your SOP knowledge",
    href: "#",
    active: false,
  },
]

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-base)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* ══ HERO ══════════════════════════════════════════════════════════ */}
      <section
        className="fade-in-up"
        style={{
          width: "100%",
          padding: "6rem 1.5rem 4rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Signature grid texture */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            opacity: 0.3,
            pointerEvents: "none",
          }}
        />

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(3rem, 8vw, 7rem)",
            color: "var(--color-text-primary)",
            letterSpacing: "0.05em",
            lineHeight: 1,
            position: "relative",
          }}
        >
          WAREHOUSEPRO
        </h1>
        <p
          style={{
            fontFamily: "var(--font-ui)",
            color: "var(--color-text-secondary)",
            fontSize: "1.125rem",
            marginTop: "0.75rem",
            position: "relative",
          }}
        >
          RF Picking Training Platform
        </p>

        {/* SOP badge */}
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.6875rem",
            color: "var(--color-text-muted)",
            marginTop: "1.25rem",
            padding: "0.25rem 0.75rem",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            position: "relative",
          }}
        >
          GEODIS · BBWD-WI-030 · v0.1.0
        </span>

        {/* CTA buttons */}
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            marginTop: "2.5rem",
            flexWrap: "wrap",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <Link
            href="/sim"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "0.875rem",
              letterSpacing: "0.05em",
              backgroundColor: "var(--color-amber)",
              color: "var(--color-base)",
              padding: "0.75rem 2rem",
              borderRadius: "var(--radius-md)",
              textDecoration: "none",
              transition: "background-color 0.15s",
            }}
          >
            Start Training →
          </Link>
          <Link
            href="/dashboard/supervisor"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "0.875rem",
              letterSpacing: "0.05em",
              color: "var(--color-amber)",
              border: "1px solid var(--color-amber-dim)",
              padding: "0.75rem 2rem",
              borderRadius: "var(--radius-md)",
              textDecoration: "none",
              transition: "background-color 0.15s, color 0.15s",
            }}
          >
            Supervisor Dashboard
          </Link>
        </div>
      </section>

      {/* ══ FEATURE CARDS ═════════════════════════════════════════════════ */}
      <section
        className="fade-in-up fade-in-up-2"
        style={{
          width: "100%",
          maxWidth: "56rem",
          padding: "0 1.5rem 3rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
          gap: "1rem",
        }}
      >
        {FEATURES.map((f) => (
          <div
            key={f.title}
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: "1.5rem",
              boxShadow: "var(--shadow-card)",
              opacity: f.active ? 1 : 0.45,
              cursor: f.active ? "pointer" : "not-allowed",
              transition: "border-color 0.2s, background-color 0.2s",
              borderLeft: "3px solid transparent",
            }}
            onMouseEnter={(e) => {
              if (f.active) {
                e.currentTarget.style.borderLeftColor = "var(--color-amber)"
                e.currentTarget.style.backgroundColor = "var(--color-surface-2)"
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderLeftColor = "transparent"
              e.currentTarget.style.backgroundColor = "var(--color-surface)"
            }}
          >
            {f.active ? (
              <Link href={f.href} style={{ textDecoration: "none" }}>
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "var(--color-text-primary)",
                    marginBottom: "0.375rem",
                  }}
                >
                  {f.title}
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: "0.8125rem",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {f.description}
                </p>
              </Link>
            ) : (
              <>
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "var(--color-text-primary)",
                    marginBottom: "0.375rem",
                  }}
                >
                  {f.title}
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: "0.8125rem",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {f.description} — Coming Soon
                </p>
              </>
            )}
          </div>
        ))}
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════════════════ */}
      <footer
        className="fade-in-up fade-in-up-3"
        style={{
          marginTop: "auto",
          padding: "2rem 1rem",
          textAlign: "center",
          fontFamily: "var(--font-ui)",
          fontSize: "0.6875rem",
          color: "var(--color-text-muted)",
        }}
      >
        GEODIS Logistics · WarehousePro Training Platform · BBWD-WI-030
      </footer>
    </main>
  )
}
