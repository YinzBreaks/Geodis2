import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "tactical-slate": "var(--slate-tactical)",
        "tactical-canvas": "var(--slate-canvas)",
        "steel-border": "var(--steel-border)",
        "steel-surface": "var(--steel-surface)",
        "signal-amber": "var(--signal-amber)",
        "electric-cyan": "var(--electric-cyan)",
        "laser-emerald": "var(--laser-emerald)",
        "terminal-green": "var(--terminal-green)",
        "danger-red": "var(--danger-red)",
        navy: "var(--navy)",
        "ice-blue": "var(--ice-blue)",
        "ice-white": "var(--ice-white)",
        "amber-bright": "var(--amber-bright)",
        "success-bright": "var(--success-bright)",
        "danger-bright": "var(--danger-bright)",
        concrete: "var(--concrete)",
        "warehouse-floor": "var(--warehouse-floor)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        terminal: ["var(--font-terminal)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      minHeight: {
        touch: "var(--touch-target-min)",
        "touch-primary": "var(--touch-target-primary)",
      },
      minWidth: {
        touch: "var(--touch-target-min)",
      },
    },
  },
  plugins: [],
}

export default config
