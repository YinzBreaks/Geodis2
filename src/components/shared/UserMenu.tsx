/**
 * UserMenu — Role badge with sign-out dropdown
 *
 * Client Component: renders the SUPERVISOR/TRAINEE/LEAD/MANAGER role pill
 * with a chevron. Clicking it opens a small dropdown showing the user's email
 * and a "Sign out" button.
 *
 * Must be a Client Component because it uses useState for the dropdown and
 * calls supabase.auth.signOut() on click.
 *
 * Per CLAUDE.md §Architecture: components render only — no business logic.
 * Supabase browser client is the only external dep here.
 */
"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getBrowserClient } from "@/lib/supabase/client"

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface UserMenuProps {
  /** Badge label, e.g. "SUPERVISOR" */
  roleBadge: string
  /** Authenticated email shown in the dropdown, or null if unavailable */
  email: string | null
}

/**
 * Role pill badge that opens a sign-out dropdown on click.
 * Keyboard accessible: Enter/Space toggles; Escape closes.
 */
export function UserMenu({ roleBadge, email }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close on outside click
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleOutsideClick)
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [open])

  const handleSignOut = useCallback(async () => {
    setSigningOut(true)
    const supabase = getBrowserClient()
    await supabase.auth.signOut()
    router.push("/login")
  }, [router])

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Badge / trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false)
        }}
        aria-haspopup="true"
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          fontFamily: "var(--font-display)",
          fontSize: "0.625rem",
          fontWeight: 600,
          letterSpacing: "0.1em",
          color: "var(--color-amber)",
          border: "1px solid var(--color-amber-dim)",
          borderRadius: "9999px",
          padding: "0.15rem 0.5rem 0.15rem 0.625rem",
          textTransform: "uppercase",
          background: "none",
          cursor: "pointer",
          transition: "background-color 0.15s",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(240, 165, 0, 0.08)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent"
        }}
      >
        {roleBadge}
        {/* Chevron icon */}
        <span
          style={{
            display: "inline-block",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
            fontSize: "0.55rem",
          }}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 6px)",
            minWidth: 200,
            backgroundColor: "var(--color-surface-1)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
            overflow: "hidden",
            zIndex: 100,
          }}
        >
          {/* Email row */}
          {email && (
            <div
              style={{
                padding: "10px 14px 8px",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "10px",
                  color: "var(--color-text-muted)",
                  marginBottom: "2px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Signed in as
              </p>
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "var(--color-text-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 172,
                }}
              >
                {email}
              </p>
            </div>
          )}

          {/* Sign out button */}
          <button
            role="menuitem"
            onClick={handleSignOut}
            disabled={signingOut}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "10px 14px",
              fontFamily: "var(--font-ui)",
              fontSize: "12px",
              color: signingOut ? "var(--color-text-muted)" : "var(--color-text-secondary)",
              background: "none",
              border: "none",
              cursor: signingOut ? "default" : "pointer",
              transition: "background-color 0.1s, color 0.1s",
            }}
            onMouseEnter={(e) => {
              if (!signingOut) {
                e.currentTarget.style.backgroundColor = "var(--color-surface-2)"
                e.currentTarget.style.color = "var(--color-danger)"
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent"
              e.currentTarget.style.color = "var(--color-text-secondary)"
            }}
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  )
}
