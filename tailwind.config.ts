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
        // Overhaul palette — Titans / Industrial Warehouse fusion.
        // Mapped to CSS custom properties in src/styles/tokens.css so the
        // single source of truth for color stays in the token file.
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
      },
    },
  },
  plugins: [],
}

export default config
