"""
build_vector_assets.py — Generates all production-ready SVG assets for GEODIS Nashville Simulation.
All dimensions, colors, and layouts conform strictly to ASSET_MANIFEST.md and authentic GEODIS standards.
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent / "public" / "assets"

def ensure_dirs():
    for sub in ["barcodes", "placards", "equipment", "products", "ui"]:
        (BASE_DIR / sub).mkdir(parents=True, exist_ok=True)

def write_svg(rel_path: str, content: str):
    target = BASE_DIR / rel_path
    target.parent.mkdir(parents=True, exist_ok=True)
    with open(target, "w", encoding="utf-8") as f:
        f.write(content.strip())
    print(f"[OK] Wrote {target.name} -> {target}")

# ─────────────────────────────────────────────────────────────────────────────
# 1. BARCODES & PLACARDS
# ─────────────────────────────────────────────────────────────────────────────

def gen_code128_bars(pattern_seed: str, count: int = 48) -> str:
    """Deterministic Code 128 bar pattern generator."""
    rects = []
    w = 260 / count
    val = sum(ord(c) for c in pattern_seed)
    for i in range(count):
        val = (val * 1103515245 + 12345) & 0x7FFFFFFF
        is_bar = (val % 10) < 6
        if i in [0, 1, count - 2, count - 1]:
            is_bar = True  # quiet zone guards
        if is_bar:
            rects.append(f'<rect x="{20 + i * w:.2f}" y="25" width="{w * 0.9:.2f}" height="55" fill="#111827"/>')
    return "\n      ".join(rects)

def build_barcodes():
    # Cart 04
    bars = gen_code128_bars("CART-04")
    cart_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 120" width="300" height="120">
  <defs>
    <filter id="cardGlow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.12"/>
    </filter>
  </defs>
  <rect x="5" y="5" width="290" height="110" rx="6" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" filter="url(#cardGlow)"/>
  <rect x="5" y="5" width="290" height="12" rx="4" fill="#004A99"/>
  <text x="15" y="14" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="8" font-weight="700" fill="#ffffff" letter-spacing="1">GEODIS LOGISTICS · NASHVILLE DIST. CENTER</text>
  <g>
    {bars}
  </g>
  <text x="150" y="98" font-family="'Courier New', Courier, monospace" font-size="14" font-weight="800" fill="#0f172a" text-anchor="middle" letter-spacing="3">CART-04</text>
</svg>"""
    write_svg("barcodes/barcode_cart_04.svg", cart_svg)

    # Tote 01
    bars_tote = gen_code128_bars("TOTE-01")
    tote1_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 120" width="300" height="120">
  <rect x="5" y="5" width="290" height="110" rx="6" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
  <rect x="5" y="5" width="290" height="10" rx="4" fill="#0284c7"/>
  <text x="15" y="13" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="8" font-weight="700" fill="#ffffff" letter-spacing="1">ORBIS STANDARD FLIPAK TOTE · SLOT 01</text>
  <g>
    {bars_tote}
  </g>
  <text x="150" y="98" font-family="'Courier New', Courier, monospace" font-size="14" font-weight="800" fill="#0f172a" text-anchor="middle" letter-spacing="2">T00000000010001 (TOTE-01)</text>
</svg>"""
    write_svg("barcodes/barcode_tote_01.svg", tote1_svg)

    # Tote 09 Hazmat
    bars_haz = gen_code128_bars("TOTE-09-HAZ")
    tote_haz_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 120" width="300" height="120">
  <rect x="5" y="5" width="290" height="110" rx="6" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>
  <!-- Hazard chevron borders -->
  <path d="M5,5 L20,5 L5,20 Z M35,5 L50,5 L5,50 L5,35 Z M65,5 L80,5 L5,80 L5,65 Z M95,5 L110,5 L5,110 L5,95 Z" fill="#ca8a04" opacity="0.35"/>
  <rect x="25" y="14" width="250" height="80" rx="4" fill="#ffffff" stroke="#eab308" stroke-width="1"/>
  <g>
    {bars_haz}
  </g>
  <text x="150" y="108" font-family="'Courier New', Courier, monospace" font-size="12" font-weight="900" fill="#854d0e" text-anchor="middle" letter-spacing="2">TOTE-09-HAZ · SEGREGATED CONT.</text>
</svg>"""
    write_svg("barcodes/barcode_tote_09_haz.svg", tote_haz_svg)

    # Shelf ALOC Barcodes (Aisle 316 Bay 01 Levels A, B, C, D)
    levels = [
        ("a", "A", "47", "316-01-A-01", "LEVEL A · FLOOR PALLET"),
        ("b", "B", "83", "316-01-B-01", "LEVEL B · GOLDEN ZONE"),
        ("c", "C", "62", "316-01-C-01", "LEVEL C · CHEST HEIGHT"),
        ("d", "D", "14", "316-01-D-01", "LEVEL D · TOP REACH"),
    ]
    for key, lvl, cd, aloc, desc in levels:
        bars_loc = gen_code128_bars(aloc, count=44)
        svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 140" width="360" height="140">
  <defs>
    <filter id="drop" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.2"/>
    </filter>
  </defs>
  <rect x="5" y="5" width="350" height="130" rx="8" fill="#ffffff" stroke="#004A99" stroke-width="2" filter="url(#drop)"/>
  
  <!-- Left metadata column -->
  <rect x="5" y="5" width="70" height="130" rx="6" fill="#004A99"/>
  <text x="40" y="32" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" fill="#93c5fd" text-anchor="middle">AISLE</text>
  <text x="40" y="56" font-family="'Courier New', Courier, monospace" font-size="20" font-weight="900" fill="#ffffff" text-anchor="middle">316</text>
  <text x="40" y="86" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" fill="#93c5fd" text-anchor="middle">TIER</text>
  <rect x="18" y="94" width="44" height="28" rx="4" fill="#f59e0b"/>
  <text x="40" y="114" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="900" fill="#0f172a" text-anchor="middle">{lvl}</text>

  <!-- Middle Barcode Section -->
  <g transform="translate(68, 5)">
    <text x="90" y="22" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" fill="#64748b" text-anchor="middle">{desc}</text>
    <g transform="translate(-10, 8)">
      {bars_loc}
    </g>
    <text x="100" y="104" font-family="'Courier New', Courier, monospace" font-size="15" font-weight="800" fill="#0f172a" text-anchor="middle" letter-spacing="1">{aloc}</text>
  </g>

  <!-- Right Reverse-Contrast Check Digit Box (GEODIS Benchmark Standard) -->
  <g transform="translate(280, 10)">
    <rect x="0" y="0" width="65" height="120" rx="6" fill="#090d16" stroke="#1e293b" stroke-width="1.5"/>
    <text x="32" y="24" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="8" font-weight="800" fill="#94a3b8" text-anchor="middle" letter-spacing="1">CHECK</text>
    <text x="32" y="36" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="8" font-weight="800" fill="#94a3b8" text-anchor="middle" letter-spacing="1">DIGIT</text>
    <line x1="8" y1="46" x2="57" y2="46" stroke="#334155" stroke-width="1"/>
    <text x="32" y="92" font-family="'Courier New', Courier, monospace" font-size="34" font-weight="900" fill="#38bdf8" text-anchor="middle">{cd}</text>
  </g>
</svg>"""
        write_svg(f"barcodes/barcode_loc_316_01_{key}_01.svg", svg)

    # Overhead Placards
    # Bulk Zone Z1
    bars_z1 = gen_code128_bars("Z1", count=36)
    placard_z1 = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 220" width="500" height="220">
  <defs>
    <linearGradient id="yellowReflect" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#fef08a"/>
      <stop offset="60%" stopColor="#facc15"/>
      <stop offset="100%" stopColor="#eab308"/>
    </linearGradient>
  </defs>
  <!-- Suspension Mounting Loops -->
  <circle cx="80" cy="18" r="8" fill="none" stroke="#64748b" stroke-width="4"/>
  <circle cx="420" cy="18" r="8" fill="none" stroke="#64748b" stroke-width="4"/>
  <rect x="10" y="28" width="480" height="184" rx="10" fill="url(#yellowReflect)" stroke="#ca8a04" stroke-width="3"/>
  <rect x="20" y="38" width="460" height="164" rx="8" fill="none" stroke="#000000" stroke-width="3"/>
  
  <text x="250" y="78" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="900" fill="#000000" text-anchor="middle" letter-spacing="2">BULK ZONE · Z1</text>
  <rect x="70" y="92" width="360" height="74" rx="4" fill="#ffffff" stroke="#000000" stroke-width="1.5"/>
  <g transform="translate(65, 80)">
    {bars_z1}
  </g>
  <text x="250" y="196" font-family="'Courier New', Courier, monospace" font-size="16" font-weight="900" fill="#000000" text-anchor="middle" letter-spacing="6">SCAN: Z1</text>
</svg>"""
    write_svg("placards/placard_bulk_zone_z1.svg", placard_z1)

    # Task Group FEX
    bars_fex = gen_code128_bars("FEX", count=36)
    placard_fex = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 220" width="500" height="220">
  <circle cx="80" cy="18" r="8" fill="none" stroke="#64748b" stroke-width="4"/>
  <circle cx="420" cy="18" r="8" fill="none" stroke="#64748b" stroke-width="4"/>
  <rect x="10" y="28" width="480" height="184" rx="10" fill="#004A99" stroke="#1d4ed8" stroke-width="3"/>
  <rect x="20" y="38" width="460" height="164" rx="8" fill="none" stroke="#ffffff" stroke-width="2"/>
  
  <text x="250" y="76" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2">PRIORITY TASK GROUP · FEX</text>
  <rect x="70" y="90" width="360" height="74" rx="4" fill="#ffffff"/>
  <g transform="translate(65, 78)">
    {bars_fex}
  </g>
  <text x="250" y="196" font-family="'Courier New', Courier, monospace" font-size="16" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="6">SCAN: FEX</text>
</svg>"""
    write_svg("placards/placard_task_group_fex.svg", placard_fex)

    # Putwall Conveyor
    bars_pw = gen_code128_bars("PUTWALL-01", count=40)
    placard_pw = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200" width="600" height="200">
  <rect x="10" y="10" width="580" height="180" rx="10" fill="#0f172a" stroke="#38bdf8" stroke-width="3"/>
  <!-- Status photo-eye dot -->
  <circle cx="40" cy="40" r="8" fill="#10b981"/>
  <circle cx="40" cy="40" r="14" fill="none" stroke="#10b981" opacity="0.4"/>
  <text x="70" y="46" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="900" fill="#f8fafc" letter-spacing="1">PUTWALL 01 · TAKEAWAY INDUCTION CONVEYOR</text>
  <rect x="40" y="65" width="520" height="85" rx="4" fill="#ffffff"/>
  <g transform="translate(110, 52)">
    {bars_pw}
  </g>
  <text x="300" y="180" font-family="'Courier New', Courier, monospace" font-size="14" font-weight="800" fill="#38bdf8" text-anchor="middle" letter-spacing="3">RMR-TAKEAWAY · AUTOMATED DISPATCH</text>
</svg>"""
    write_svg("placards/placard_putwall_conveyor.svg", placard_pw)

# ─────────────────────────────────────────────────────────────────────────────
# 2. EQUIPMENT & STRUCTURAL
# ─────────────────────────────────────────────────────────────────────────────

def build_equipment():
    # Pick Cart SVG
    cart_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 640" width="800" height="640">
  <defs>
    <linearGradient id="alum" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#94a3b8"/>
      <stop offset="25%" stopColor="#f8fafc"/>
      <stop offset="60%" stopColor="#cbd5e1"/>
      <stop offset="100%" stopColor="#64748b"/>
    </linearGradient>
    <linearGradient id="toteGlow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#1e293b"/>
      <stop offset="100%" stopColor="#0f172a"/>
    </linearGradient>
  </defs>
  <!-- Floor shadow -->
  <ellipse cx="400" cy="610" rx="340" ry="22" fill="#000000" opacity="0.25"/>

  <!-- Tubular Framework: Uprights & Handles -->
  <!-- Rear frame -->
  <path d="M120,80 L120,570 M680,80 L680,570" stroke="url(#alum)" stroke-width="24" stroke-linecap="round"/>
  <!-- Ergonomic Push Handle Bar -->
  <path d="M80,120 L120,80 L680,80 L720,120" fill="none" stroke="url(#alum)" stroke-width="28" stroke-linejoin="round" stroke-linecap="round"/>
  <rect x="320" y="70" width="160" height="20" rx="6" fill="#004A99"/>
  <text x="400" y="84" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="900" fill="#ffffff" text-anchor="middle">GEODIS C000000083</text>

  <!-- 3 Shelf Decks (Top, Middle, Bottom) -->
  <!-- Top Tier Shelf (Slots 1, 2, 3) -->
  <rect x="110" y="160" width="580" height="20" rx="4" fill="url(#alum)" stroke="#475569" stroke-width="2"/>
  <!-- Middle Tier Shelf (Slots 4, 5, 6) -->
  <rect x="110" y="310" width="580" height="20" rx="4" fill="url(#alum)" stroke="#475569" stroke-width="2"/>
  <!-- Bottom Tier Shelf (Slots 7, 8, 9) -->
  <rect x="110" y="470" width="580" height="24" rx="4" fill="url(#alum)" stroke="#475569" stroke-width="2"/>

  <!-- 9 Tote Slots (Totes seated in bays) -->
  <!-- Slots 1, 2, 3 -->
  <rect x="135" y="195" width="155" height="105" rx="6" fill="url(#toteGlow)" stroke="#38bdf8" stroke-width="2"/>
  <text x="212" y="255" font-family="'Courier New', Courier, monospace" font-size="14" font-weight="900" fill="#38bdf8" text-anchor="middle">SLOT 01</text>

  <rect x="322" y="195" width="155" height="105" rx="6" fill="url(#toteGlow)" stroke="#38bdf8" stroke-width="2"/>
  <text x="400" y="255" font-family="'Courier New', Courier, monospace" font-size="14" font-weight="900" fill="#38bdf8" text-anchor="middle">SLOT 02</text>

  <rect x="509" y="195" width="155" height="105" rx="6" fill="url(#toteGlow)" stroke="#38bdf8" stroke-width="2"/>
  <text x="586" y="255" font-family="'Courier New', Courier, monospace" font-size="14" font-weight="900" fill="#38bdf8" text-anchor="middle">SLOT 03</text>

  <!-- Slots 4, 5, 6 -->
  <rect x="135" y="345" width="155" height="115" rx="6" fill="url(#toteGlow)" stroke="#64748b" stroke-width="2"/>
  <text x="212" y="410" font-family="'Courier New', Courier, monospace" font-size="14" font-weight="900" fill="#94a3b8" text-anchor="middle">SLOT 04</text>

  <rect x="322" y="345" width="155" height="115" rx="6" fill="url(#toteGlow)" stroke="#64748b" stroke-width="2"/>
  <text x="400" y="410" font-family="'Courier New', Courier, monospace" font-size="14" font-weight="900" fill="#94a3b8" text-anchor="middle">SLOT 05</text>

  <rect x="509" y="345" width="155" height="115" rx="6" fill="url(#toteGlow)" stroke="#64748b" stroke-width="2"/>
  <text x="586" y="410" font-family="'Courier New', Courier, monospace" font-size="14" font-weight="900" fill="#94a3b8" text-anchor="middle">SLOT 06</text>

  <!-- Slots 7, 8, 9 -->
  <rect x="135" y="505" width="155" height="75" rx="6" fill="url(#toteGlow)" stroke="#64748b" stroke-width="2"/>
  <text x="212" y="550" font-family="'Courier New', Courier, monospace" font-size="14" font-weight="900" fill="#94a3b8" text-anchor="middle">SLOT 07</text>

  <rect x="322" y="505" width="155" height="75" rx="6" fill="url(#toteGlow)" stroke="#64748b" stroke-width="2"/>
  <text x="400" y="550" font-family="'Courier New', Courier, monospace" font-size="14" font-weight="900" fill="#94a3b8" text-anchor="middle">SLOT 08</text>

  <!-- Slot 9 HAZMAT containment tote -->
  <rect x="509" y="505" width="155" height="75" rx="6" fill="#854d0e" stroke="#eab308" stroke-width="2"/>
  <text x="586" y="550" font-family="'Courier New', Courier, monospace" font-size="12" font-weight="900" fill="#fef08a" text-anchor="middle">SLOT 09 (HAZ)</text>

  <!-- 4 Heavy Caster Wheels -->
  <!-- Left Wheel Assembly -->
  <g transform="translate(130, 560)">
    <rect x="-12" y="0" width="24" height="24" fill="#334155"/>
    <circle cx="0" cy="36" r="26" fill="#1e293b" stroke="#64748b" stroke-width="5"/>
    <circle cx="0" cy="36" r="10" fill="#94a3b8"/>
  </g>
  <!-- Right Wheel Assembly -->
  <g transform="translate(670, 560)">
    <rect x="-12" y="0" width="24" height="24" fill="#334155"/>
    <circle cx="0" cy="36" r="26" fill="#1e293b" stroke="#64748b" stroke-width="5"/>
    <circle cx="0" cy="36" r="10" fill="#94a3b8"/>
  </g>
</svg>"""
    write_svg("equipment/pick_cart.svg", cart_svg)

    # Standard Empty Tote
    tote_empty = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420" width="600" height="420">
  <defs>
    <linearGradient id="toteSlate" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#334155"/>
      <stop offset="40%" stopColor="#1e293b"/>
      <stop offset="100%" stopColor="#0f172a"/>
    </linearGradient>
    <linearGradient id="toteRim" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#475569"/>
      <stop offset="50%" stopColor="#64748b"/>
      <stop offset="100%" stopColor="#334155"/>
    </linearGradient>
  </defs>
  <!-- Main Bin Trapezoid -->
  <polygon points="50,70 550,70 510,380 90,380" fill="url(#toteSlate)" stroke="#0f172a" stroke-width="3"/>
  <!-- Top Heavy Stacking Rim -->
  <rect x="35" y="45" width="530" height="35" rx="6" fill="url(#toteRim)" stroke="#1e293b" stroke-width="2"/>
  <!-- Ribbed side reinforcement columns -->
  <line x1="160" y1="80" x2="180" y2="370" stroke="#475569" stroke-width="6"/>
  <line x1="240" y1="80" x2="250" y2="370" stroke="#475569" stroke-width="6"/>
  <line x1="360" y1="80" x2="350" y2="370" stroke="#475569" stroke-width="6"/>
  <line x1="440" y1="80" x2="420" y2="370" stroke="#475569" stroke-width="6"/>

  <!-- Molded Carry Handle -->
  <rect x="250" y="52" width="100" height="18" rx="8" fill="#0f172a"/>

  <!-- Barcode Placard Holder -->
  <rect x="180" y="210" width="240" height="85" rx="4" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <text x="300" y="240" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="900" fill="#004A99" text-anchor="middle">GEODIS LOGISTICS</text>
  <rect x="210" y="250" width="180" height="30" fill="#0f172a"/>
  <text x="300" y="270" font-family="'Courier New', Courier, monospace" font-size="12" font-weight="800" fill="#ffffff" text-anchor="middle">T00000000010001</text>
</svg>"""
    write_svg("equipment/tote_standard_empty.svg", tote_empty)

    # Standard Loaded Tote
    tote_loaded = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420" width="600" height="420">
  <defs>
    <linearGradient id="toteSlate2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#334155"/>
      <stop offset="100%" stopColor="#0f172a"/>
    </linearGradient>
  </defs>
  <polygon points="50,70 550,70 510,380 90,380" fill="url(#toteSlate2)" stroke="#0f172a" stroke-width="3"/>
  <rect x="35" y="45" width="530" height="35" rx="6" fill="#475569" stroke="#1e293b" stroke-width="2"/>

  <!-- Picked contents protruding from tote top -->
  <!-- Box 1 -->
  <rect x="90" y="25" width="130" height="90" rx="4" fill="#d97706" stroke="#78350f" stroke-width="2"/>
  <line x1="90" y1="55" x2="220" y2="55" stroke="#92400e" stroke-width="1.5"/>
  <text x="155" y="75" font-family="'Courier New', Courier, monospace" font-size="11" font-weight="900" fill="#fef3c7" text-anchor="middle">SKU-024505572</text>

  <!-- Box 2 (Widget Blue bottle) -->
  <rect x="240" y="10" width="110" height="110" rx="8" fill="#1e40af" stroke="#172554" stroke-width="2"/>
  <rect x="275" y="-5" width="40" height="15" rx="3" fill="#ffffff"/>
  <text x="295" y="65" font-family="'Courier New', Courier, monospace" font-size="11" font-weight="900" fill="#dbeafe" text-anchor="middle">QTY: 1 EA</text>

  <!-- Pack 3 (Tools) -->
  <rect x="370" y="30" width="140" height="85" rx="4" fill="#047857" stroke="#064e3b" stroke-width="2"/>
  <text x="440" y="75" font-family="'Courier New', Courier, monospace" font-size="11" font-weight="900" fill="#d1fae5" text-anchor="middle">TORQUE WRENCH</text>

  <!-- Foreground tote front wall -->
  <polygon points="50,70 550,70 510,380 90,380" fill="#1e293b" opacity="0.95"/>
  <rect x="35" y="45" width="530" height="35" rx="6" fill="#334155" stroke="#1e293b" stroke-width="2"/>
  <rect x="180" y="210" width="240" height="85" rx="4" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <text x="300" y="238" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="900" fill="#004A99" text-anchor="middle">ACTIVE ROUND · 3 ITEMS</text>
  <rect x="210" y="248" width="180" height="30" fill="#0f172a"/>
  <text x="300" y="268" font-family="'Courier New', Courier, monospace" font-size="12" font-weight="800" fill="#ffffff" text-anchor="middle">T00000000010001</text>
</svg>"""
    write_svg("equipment/tote_standard_loaded.svg", tote_loaded)

    # Hazmat Tote Empty
    tote_haz_empty = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420" width="600" height="420">
  <defs>
    <linearGradient id="hazYellow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#fef08a"/>
      <stop offset="40%" stopColor="#facc15"/>
      <stop offset="100%" stopColor="#ca8a04"/>
    </linearGradient>
  </defs>
  <polygon points="50,70 550,70 510,380 90,380" fill="url(#hazYellow)" stroke="#854d0e" stroke-width="3"/>
  <rect x="35" y="45" width="530" height="35" rx="6" fill="#eab308" stroke="#854d0e" stroke-width="2"/>

  <!-- Diagonal hazard striping band -->
  <g transform="translate(70, 110)">
    <rect x="0" y="0" width="460" height="30" fill="#000000"/>
    <polygon points="10,30 30,0 50,0 30,30" fill="#facc15"/>
    <polygon points="60,30 80,0 100,0 80,30" fill="#facc15"/>
    <polygon points="110,30 130,0 150,0 130,30" fill="#facc15"/>
    <polygon points="160,30 180,0 200,0 180,30" fill="#facc15"/>
    <polygon points="210,30 230,0 250,0 230,30" fill="#facc15"/>
    <polygon points="260,30 280,0 300,0 280,30" fill="#facc15"/>
    <polygon points="310,30 330,0 350,0 330,30" fill="#facc15"/>
    <polygon points="360,30 380,0 400,0 380,30" fill="#facc15"/>
    <polygon points="410,30 430,0 450,0 430,30" fill="#facc15"/>
  </g>

  <!-- Absorbent Liner Inside callout -->
  <rect x="150" y="160" width="300" height="40" rx="6" fill="#fef9c3" stroke="#ca8a04" stroke-width="1.5"/>
  <text x="300" y="185" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="900" fill="#713f12" text-anchor="middle">CHEMICAL ABSORBENT LINER INSTALLED</text>

  <!-- Placard Holder -->
  <rect x="180" y="230" width="240" height="85" rx="4" fill="#ffffff" stroke="#eab308" stroke-width="2"/>
  <text x="300" y="258" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="900" fill="#b91c1c" text-anchor="middle">HAZMAT DEDICATED</text>
  <rect x="210" y="268" width="180" height="32" fill="#854d0e"/>
  <text x="300" y="289" font-family="'Courier New', Courier, monospace" font-size="13" font-weight="900" fill="#fef08a" text-anchor="middle">TOTE-09-HAZ</text>
</svg>"""
    write_svg("equipment/tote_hazmat_empty.svg", tote_haz_empty)

    # Hazmat Tote Loaded
    tote_haz_loaded = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420" width="600" height="420">
  <defs>
    <linearGradient id="hazYellowL" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#fef08a"/>
      <stop offset="100%" stopColor="#ca8a04"/>
    </linearGradient>
  </defs>
  <polygon points="50,70 550,70 510,380 90,380" fill="url(#hazYellowL)" stroke="#854d0e" stroke-width="3"/>
  <rect x="35" y="45" width="530" height="35" rx="6" fill="#eab308" stroke="#854d0e" stroke-width="2"/>

  <!-- Chemical Bottle sealed in secondary clear containment ziplock bag -->
  <g transform="translate(200, 20)">
    <!-- Bag outline -->
    <rect x="0" y="0" width="200" height="150" rx="8" fill="#ffffff" fill-opacity="0.4" stroke="#38bdf8" stroke-width="2"/>
    <rect x="0" y="0" width="200" height="16" fill="#0284c7"/>
    <text x="100" y="12" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" font-weight="800" fill="#ffffff" text-anchor="middle">SECONDARY ZIPLOCK SEALED</text>
    <!-- Leaking solvent can inside -->
    <rect x="50" y="30" width="100" height="90" rx="6" fill="#64748b" stroke="#334155" stroke-width="2"/>
    <polygon points="100,50 125,75 100,100 75,75" fill="#dc2626"/>
    <text x="100" y="79" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="900" fill="#ffffff" text-anchor="middle">FLAM</text>
  </g>

  <!-- Foreground wall -->
  <polygon points="50,70 550,70 510,380 90,380" fill="#ca8a04" opacity="0.95"/>
  <rect x="35" y="45" width="530" height="35" rx="6" fill="#eab308" stroke="#854d0e" stroke-width="2"/>
  <rect x="180" y="230" width="240" height="85" rx="4" fill="#ffffff" stroke="#b91c1c" stroke-width="2"/>
  <text x="300" y="258" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="900" fill="#b91c1c" text-anchor="middle">CONTAINED SPILL ACTIVE</text>
  <rect x="210" y="268" width="180" height="32" fill="#854d0e"/>
  <text x="300" y="289" font-family="'Courier New', Courier, monospace" font-size="13" font-weight="900" fill="#fef08a" text-anchor="middle">TOTE-09-HAZ</text>
</svg>"""
    write_svg("equipment/tote_hazmat_loaded.svg", tote_haz_loaded)

    # Symbol WT4000 / WT4090 Wearable Terminal Chassis
    wt4000_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1270 999" width="1270" height="999">
  <defs>
    <linearGradient id="chassisGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#374151"/>
      <stop offset="40%" stopColor="#1f2937"/>
      <stop offset="100%" stopColor="#111827"/>
    </linearGradient>
    <radialGradient id="glassGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#0f2619"/>
      <stop offset="100%" stopColor="#03120a"/>
    </radialGradient>
  </defs>
  <!-- Forearm Wrist Mount Padded Cradle -->
  <rect x="80" y="100" width="1110" height="800" rx="50" fill="#0b0f19" stroke="#1f2937" stroke-width="8"/>
  <rect x="30" y="250" width="70" height="500" rx="15" fill="#1e293b"/>
  <rect x="1170" y="250" width="70" height="500" rx="15" fill="#1e293b"/>

  <!-- Main Ruggedized Polymer Terminal Body -->
  <rect x="140" y="150" width="990" height="700" rx="30" fill="url(#chassisGrad)" stroke="#4b5563" stroke-width="6"/>

  <!-- Left Modifier Keypad Column (ESC, TAB, ALT/CTRL, SHIFT, BLUE SCAN) -->
  <rect x="180" y="210" width="90" height="60" rx="8" fill="#374151" stroke="#6b7280" stroke-width="2"/>
  <text x="225" y="248" font-family="'Courier New', Courier, monospace" font-size="18" font-weight="900" fill="#ffffff" text-anchor="middle">ESC</text>

  <rect x="180" y="295" width="90" height="60" rx="8" fill="#374151" stroke="#6b7280" stroke-width="2"/>
  <text x="225" y="333" font-family="'Courier New', Courier, monospace" font-size="16" font-weight="900" fill="#ffffff" text-anchor="middle">TAB</text>

  <rect x="180" y="380" width="90" height="60" rx="8" fill="#1d4ed8" stroke="#3b82f6" stroke-width="2"/>
  <text x="225" y="418" font-family="'Courier New', Courier, monospace" font-size="15" font-weight="900" fill="#ffffff" text-anchor="middle">CTRL</text>

  <rect x="180" y="465" width="90" height="60" rx="8" fill="#d97706" stroke="#f59e0b" stroke-width="2"/>
  <text x="225" y="503" font-family="'Courier New', Courier, monospace" font-size="15" font-weight="900" fill="#ffffff" text-anchor="middle">SHIFT</text>

  <!-- Large Blue Scan Trigger Key -->
  <rect x="180" y="550" width="90" height="90" rx="12" fill="#0284c7" stroke="#38bdf8" stroke-width="3"/>
  <text x="225" y="605" font-family="'Courier New', Courier, monospace" font-size="20" font-weight="900" fill="#ffffff" text-anchor="middle">SCAN</text>

  <!-- Triple Status LEDs above display -->
  <!-- Decode Green LED -->
  <circle cx="360" cy="185" r="10" fill="#22c55e"/>
  <text x="360" y="165" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="800" fill="#9ca3af" text-anchor="middle">DECODE</text>
  <!-- Warning Amber LED -->
  <circle cx="530" cy="185" r="10" fill="#eab308"/>
  <text x="530" y="165" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="800" fill="#9ca3af" text-anchor="middle">WARN</text>
  <!-- Error Red LED -->
  <circle cx="700" cy="185" r="10" fill="#ef4444"/>
  <text x="700" y="165" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="800" fill="#9ca3af" text-anchor="middle">ERROR</text>

  <!-- Landscape LCD Screen Glass Bezel -->
  <rect x="310" y="210" width="460" height="370" rx="14" fill="#000000" stroke="#374151" stroke-width="4"/>
  <rect x="325" y="225" width="430" height="340" rx="8" fill="url(#glassGrad)"/>
  
  <!-- Active Green Phosphor Terminal Lines (Authentic GEODIS WMS Display) -->
  <text x="345" y="260" font-family="'Courier New', Courier, monospace" font-size="18" font-weight="700" fill="#22c55e">Tote: T00000000010001</text>
  <rect x="340" y="275" width="400" height="32" fill="#7f1d1d"/>
  <text x="345" y="298" font-family="'Courier New', Courier, monospace" font-size="20" font-weight="900" fill="#ffffff">Aloc: 316-01-B-01 (CD:83)</text>
  <text x="345" y="340" font-family="'Courier New', Courier, monospace" font-size="18" font-weight="700" fill="#22c55e">Item: 024505572</text>
  <text x="345" y="375" font-family="'Courier New', Courier, monospace" font-size="18" font-weight="700" fill="#22c55e">Item (Last 4): 2001</text>
  <text x="345" y="410" font-family="'Courier New', Courier, monospace" font-size="18" font-weight="700" fill="#22c55e">Qty:  1 Unit</text>
  <text x="345" y="450" font-family="'Courier New', Courier, monospace" font-size="20" font-weight="900" fill="#facc15">Item Barcode: _</text>

  <!-- Right Alphanumeric Keypad Grid -->
  <!-- Row 1: 1/A 2/B 3/C -->
  <rect x="810" y="220" width="85" height="70" rx="8" fill="#1f2937" stroke="#4b5563" stroke-width="2"/>
  <text x="852" y="262" font-family="'Courier New', Courier, monospace" font-size="24" font-weight="900" fill="#ffffff" text-anchor="middle">1</text>

  <rect x="910" y="220" width="85" height="70" rx="8" fill="#1f2937" stroke="#4b5563" stroke-width="2"/>
  <text x="952" y="262" font-family="'Courier New', Courier, monospace" font-size="24" font-weight="900" fill="#ffffff" text-anchor="middle">2</text>

  <rect x="1010" y="220" width="85" height="70" rx="8" fill="#1f2937" stroke="#4b5563" stroke-width="2"/>
  <text x="1052" y="262" font-family="'Courier New', Courier, monospace" font-size="24" font-weight="900" fill="#ffffff" text-anchor="middle">3</text>

  <!-- Row 2: 4 5 6 -->
  <rect x="810" y="305" width="85" height="70" rx="8" fill="#1f2937" stroke="#4b5563" stroke-width="2"/>
  <text x="852" y="347" font-family="'Courier New', Courier, monospace" font-size="24" font-weight="900" fill="#ffffff" text-anchor="middle">4</text>

  <rect x="910" y="305" width="85" height="70" rx="8" fill="#1f2937" stroke="#4b5563" stroke-width="2"/>
  <text x="952" y="347" font-family="'Courier New', Courier, monospace" font-size="24" font-weight="900" fill="#ffffff" text-anchor="middle">5</text>

  <rect x="1010" y="305" width="85" height="70" rx="8" fill="#1f2937" stroke="#4b5563" stroke-width="2"/>
  <text x="1052" y="347" font-family="'Courier New', Courier, monospace" font-size="24" font-weight="900" fill="#ffffff" text-anchor="middle">6</text>

  <!-- Row 3: 7 8 9 -->
  <rect x="810" y="390" width="85" height="70" rx="8" fill="#1f2937" stroke="#4b5563" stroke-width="2"/>
  <text x="852" y="432" font-family="'Courier New', Courier, monospace" font-size="24" font-weight="900" fill="#ffffff" text-anchor="middle">7</text>

  <rect x="910" y="390" width="85" height="70" rx="8" fill="#1f2937" stroke="#4b5563" stroke-width="2"/>
  <text x="952" y="432" font-family="'Courier New', Courier, monospace" font-size="24" font-weight="900" fill="#ffffff" text-anchor="middle">8</text>

  <rect x="1010" y="390" width="85" height="70" rx="8" fill="#1f2937" stroke="#4b5563" stroke-width="2"/>
  <text x="1052" y="432" font-family="'Courier New', Courier, monospace" font-size="24" font-weight="900" fill="#ffffff" text-anchor="middle">9</text>

  <!-- Row 4: BKSP 0 ENTER -->
  <rect x="810" y="475" width="85" height="70" rx="8" fill="#b91c1c" stroke="#dc2626" stroke-width="2"/>
  <text x="852" y="517" font-family="'Courier New', Courier, monospace" font-size="18" font-weight="900" fill="#ffffff" text-anchor="middle">BKSP</text>

  <rect x="910" y="475" width="85" height="70" rx="8" fill="#1f2937" stroke="#4b5563" stroke-width="2"/>
  <text x="952" y="517" font-family="'Courier New', Courier, monospace" font-size="24" font-weight="900" fill="#ffffff" text-anchor="middle">0</text>

  <rect x="1010" y="475" width="85" height="70" rx="8" fill="#15803d" stroke="#22c55e" stroke-width="2"/>
  <text x="1052" y="517" font-family="'Courier New', Courier, monospace" font-size="18" font-weight="900" fill="#ffffff" text-anchor="middle">ENT</text>
</svg>"""
    write_svg("equipment/wearable_terminal_wt4000.svg", wt4000_svg)

    # Zebra RS5100 Ring Scanner
    rs5100_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <!-- Finger Mount Strap -->
  <ellipse cx="200" cy="270" rx="90" ry="70" fill="none" stroke="#1e293b" stroke-width="24"/>
  <ellipse cx="200" cy="270" rx="90" ry="70" fill="none" stroke="#475569" stroke-width="4" stroke-dasharray="6 6"/>

  <!-- Scanner Main Module Housing -->
  <rect x="110" y="70" width="180" height="150" rx="20" fill="#18181b" stroke="#3f3f46" stroke-width="4"/>
  
  <!-- Optical Scan Window (Front Face) -->
  <rect x="130" y="80" width="140" height="50" rx="8" fill="#09090b" stroke="#27272a" stroke-width="2"/>
  <rect x="145" y="90" width="110" height="30" rx="4" fill="#450a0a"/>
  <!-- Red Laser / Green Aimer Reticle Dot -->
  <circle cx="200" cy="105" r="6" fill="#22c55e"/>
  <line x1="160" y1="105" x2="240" y2="105" stroke="#ef4444" stroke-width="2"/>

  <!-- Top Status LED Pill -->
  <rect x="165" y="145" width="70" height="16" rx="8" fill="#22c55e" stroke="#15803d" stroke-width="2"/>

  <!-- Ambidextrous Thumb Trigger Button (Side Wing) -->
  <path d="M290,130 Q330,150 290,190 Z" fill="#0284c7" stroke="#0369a1" stroke-width="2"/>
  <text x="305" y="165" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="900" fill="#ffffff">PULL</text>
  
  <text x="200" y="200" font-family="'Courier New', Courier, monospace" font-size="12" font-weight="800" fill="#a1a1aa" text-anchor="middle">ZEBRA RS5100</text>
</svg>"""
    write_svg("equipment/ring_scanner_rs5100.svg", rs5100_svg)

    # Crown Reach Truck SVG
    crown_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
  <ellipse cx="400" cy="740" rx="300" ry="30" fill="#000000" opacity="0.3"/>
  <!-- Base chassis in GEODIS Blue -->
  <rect x="250" y="520" width="300" height="180" rx="20" fill="#004A99" stroke="#1e3a8a" stroke-width="4"/>
  <circle cx="300" cy="700" r="40" fill="#18181b" stroke="#71717a" stroke-width="6"/>
  <circle cx="500" cy="700" r="40" fill="#18181b" stroke="#71717a" stroke-width="6"/>

  <!-- Vertical Steel Telescoping Mast -->
  <rect x="360" y="80" width="25" height="540" fill="#475569"/>
  <rect x="415" y="80" width="25" height="540" fill="#475569"/>
  <!-- Cross Braces -->
  <line x1="360" y1="160" x2="440" y2="220" stroke="#334155" stroke-width="6"/>
  <line x1="360" y1="300" x2="440" y2="360" stroke="#334155" stroke-width="6"/>

  <!-- Overhead Safety Guard (Yellow) -->
  <path d="M280,180 L520,180 L520,240 L280,240 Z" fill="#eab308" stroke="#a16207" stroke-width="4"/>
  <line x1="320" y1="180" x2="320" y2="520" stroke="#eab308" stroke-width="8"/>
  <line x1="480" y1="180" x2="480" y2="520" stroke="#eab308" stroke-width="8"/>

  <text x="400" y="600" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="900" fill="#ffffff" text-anchor="middle">CROWN SP 4000</text>
  <text x="400" y="630" font-family="'Courier New', Courier, monospace" font-size="14" font-weight="800" fill="#93c5fd" text-anchor="middle">GEODIS FLEET #TRK-840</text>
</svg>"""
    write_svg("equipment/reach_truck_crown.svg", crown_svg)

    # Column Bollard GEODIS
    column_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 600" width="300" height="600">
  <!-- Steel I-Beam Column upper shaft -->
  <rect x="110" y="10" width="80" height="260" fill="#475569" stroke="#334155" stroke-width="2"/>
  <rect x="90" y="10" width="20" height="260" fill="#334155"/>
  <rect x="190" y="10" width="20" height="260" fill="#334155"/>

  <!-- GEODIS Blue Cylindrical Bollard Protector Wrap -->
  <rect x="60" y="270" width="180" height="300" rx="30" fill="#004A99" stroke="#1d4ed8" stroke-width="4"/>
  <!-- Silver Reflective Safety Stripes -->
  <rect x="60" y="330" width="180" height="25" fill="#f8fafc"/>
  <rect x="60" y="450" width="180" height="25" fill="#f8fafc"/>

  <!-- Base Impact Rim -->
  <rect x="50" y="550" width="200" height="40" rx="10" fill="#0f172a" stroke="#000000" stroke-width="3"/>
  <text x="150" y="405" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2">GEODIS</text>
</svg>"""
    write_svg("equipment/column_bollard_geodis.svg", column_svg)

    # 4-Tier Rack Elevation
    rack_elev = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 800" width="1000" height="800">
  <!-- Steel Upright Posts (GEODIS Blue) -->
  <rect x="40" y="40" width="40" height="720" rx="4" fill="#004A99" stroke="#172554" stroke-width="3"/>
  <rect x="920" y="40" width="40" height="720" rx="4" fill="#004A99" stroke="#172554" stroke-width="3"/>

  <!-- Level D (Top Reach - 2.2m) -->
  <rect x="80" y="140" width="840" height="24" rx="2" fill="#ea580c" stroke="#9a3412" stroke-width="2"/>
  <text x="120" y="125" font-family="'Courier New', Courier, monospace" font-size="14" font-weight="900" fill="#f97316">LEVEL D · TOP REACH (2.2M) · CHECK DIGIT: 14</text>
  <rect x="120" y="60" width="140" height="75" rx="4" fill="#d97706" opacity="0.8"/>
  <rect x="280" y="60" width="140" height="75" rx="4" fill="#d97706" opacity="0.8"/>

  <!-- Level C (Chest Height - 1.6m) -->
  <rect x="80" y="320" width="840" height="24" rx="2" fill="#ea580c" stroke="#9a3412" stroke-width="2"/>
  <text x="120" y="305" font-family="'Courier New', Courier, monospace" font-size="14" font-weight="900" fill="#f97316">LEVEL C · CHEST HEIGHT (1.6M) · CHECK DIGIT: 62</text>
  <rect x="120" y="240" width="140" height="75" rx="4" fill="#2563eb" opacity="0.8"/>
  <rect x="280" y="240" width="140" height="75" rx="4" fill="#2563eb" opacity="0.8"/>

  <!-- Level B (Golden Zone - 1.1m) Prime Target -->
  <rect x="80" y="500" width="840" height="28" rx="2" fill="#ea580c" stroke="#9a3412" stroke-width="2"/>
  <!-- Highlight ring on Golden Zone Level B -->
  <rect x="75" y="495" width="850" height="38" rx="4" fill="none" stroke="#22c55e" stroke-width="3" stroke-dasharray="8 6"/>
  <text x="120" y="485" font-family="'Courier New', Courier, monospace" font-size="16" font-weight="900" fill="#22c55e">LEVEL B · ERGONOMIC GOLDEN ZONE (1.1M) · CHECK DIGIT: 83</text>
  <rect x="120" y="415" width="150" height="80" rx="4" fill="#15803d"/>
  <text x="195" y="460" font-family="'Courier New', Courier, monospace" font-size="13" font-weight="900" fill="#ffffff" text-anchor="middle">PICK TARGET</text>

  <!-- Level A (Floor Pallet - 0.3m) -->
  <rect x="80" y="690" width="840" height="30" rx="2" fill="#ea580c" stroke="#9a3412" stroke-width="2"/>
  <text x="120" y="675" font-family="'Courier New', Courier, monospace" font-size="14" font-weight="900" fill="#f97316">LEVEL A · FLOOR LEVEL (0.3M) · CHECK DIGIT: 47</text>
  <rect x="120" y="605" width="220" height="80" rx="4" fill="#78350f"/>
</svg>"""
    write_svg("equipment/rack_elevation_bay01.svg", rack_elev)

    # Empty Bin Slot
    empty_bin = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
  <!-- Shelf wire decking -->
  <rect x="20" y="180" width="360" height="15" fill="#ea580c"/>
  <path d="M20,180 L80,80 L320,80 L380,180 Z" fill="#0f172a" stroke="#334155" stroke-width="2"/>
  <!-- Empty slot red dashed warning zone -->
  <rect x="70" y="100" width="260" height="70" rx="6" fill="#7f1d1d" fill-opacity="0.15" stroke="#ef4444" stroke-width="2" stroke-dasharray="6 4"/>
  <text x="200" y="135" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="900" fill="#ef4444" text-anchor="middle">EMPTY BIN SLOT (0 AVAILABLE)</text>
  <text x="200" y="155" font-family="'Courier New', Courier, monospace" font-size="11" font-weight="700" fill="#fca5a5" text-anchor="middle">INV. SHORTAGE · USE CTRL+K</text>
  <!-- Shelf ALOC tag -->
  <rect x="130" y="198" width="140" height="40" rx="4" fill="#ffffff" stroke="#004A99" stroke-width="2"/>
  <text x="200" y="222" font-family="'Courier New', Courier, monospace" font-size="13" font-weight="900" fill="#000000" text-anchor="middle">316-01-A-01 [47]</text>
</svg>"""
    write_svg("equipment/empty_bin_slot.svg", empty_bin)

    # Partial Bin Slot
    partial_bin = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
  <rect x="20" y="180" width="360" height="15" fill="#ea580c"/>
  <path d="M20,180 L80,80 L320,80 L380,180 Z" fill="#0f172a" stroke="#334155" stroke-width="2"/>
  <!-- 2 items present -->
  <rect x="90" y="110" width="60" height="65" rx="4" fill="#0284c7" stroke="#0369a1" stroke-width="1.5"/>
  <rect x="160" y="110" width="60" height="65" rx="4" fill="#0284c7" stroke="#0369a1" stroke-width="1.5"/>
  <!-- Remaining empty delta zone -->
  <rect x="230" y="110" width="100" height="65" rx="4" fill="#78350f" fill-opacity="0.2" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4 4"/>
  <text x="280" y="145" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="900" fill="#fbbf24" text-anchor="middle">SHORT: -2</text>
  
  <rect x="130" y="198" width="140" height="40" rx="4" fill="#ffffff" stroke="#004A99" stroke-width="2"/>
  <text x="200" y="222" font-family="'Courier New', Courier, monospace" font-size="13" font-weight="900" fill="#000000" text-anchor="middle">316-02-B-01 [35]</text>
</svg>"""
    write_svg("equipment/partial_bin_slot.svg", partial_bin)

# ─────────────────────────────────────────────────────────────────────────────
# 3. PRODUCTS, PACKAGING & DEFECT STATES
# ─────────────────────────────────────────────────────────────────────────────

def build_products():
    # Helper to generate standard SKU SVG
    def make_product_svg(title: str, sku: str, upc: str, body_svg: str) -> str:
        bars = gen_code128_bars(upc, count=32)
        return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <defs>
    <filter id="pDrop" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.15"/>
    </filter>
  </defs>
  <rect x="10" y="10" width="380" height="380" rx="16" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
  <!-- Header Banner -->
  <rect x="10" y="10" width="380" height="36" rx="14" fill="#004A99"/>
  <text x="200" y="32" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">{title}</text>

  <!-- Product Illustration Art -->
  <g transform="translate(0, 45)" filter="url(#pDrop)">
    {body_svg}
  </g>

  <!-- Product UPC Barcode Placard -->
  <g transform="translate(40, 270)">
    <rect x="0" y="0" width="320" height="90" rx="6" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
    <g transform="translate(30, -5)">
      {bars}
    </g>
    <text x="160" y="80" font-family="'Courier New', Courier, monospace" font-size="12" font-weight="900" fill="#0f172a" text-anchor="middle">UPC: {upc} · SKU: {sku}</text>
  </g>
</svg>"""

    # 1. Widget Alpha (Blue Cylinder Dispenser)
    w_alpha = """<rect x="150" y="40" width="100" height="150" rx="14" fill="#1d4ed8" stroke="#1e3a8a" stroke-width="3"/>
<rect x="175" y="15" width="50" height="25" rx="4" fill="#f8fafc" stroke="#94a3b8" stroke-width="2"/>
<polygon points="195,15 205,15 200,0" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5"/>
<rect x="160" y="70" width="80" height="80" rx="4" fill="#ffffff"/>
<text x="200" y="110" font-family="'Courier New', Courier, monospace" font-size="14" font-weight="900" fill="#1d4ed8" text-anchor="middle">ALPHA 250ml</text>"""
    write_svg("products/item_widget_alpha.svg", make_product_svg("WIDGET ALPHA 250ML", "024505572", "024505572001", w_alpha))

    # 2. Bracket Steel 4in
    bracket = """<path d="M120,40 L160,40 L160,160 L280,160 L280,200 L120,200 Z" fill="#94a3b8" stroke="#475569" stroke-width="4"/>
<circle cx="140" cy="70" r="10" fill="#475569"/>
<circle cx="140" cy="120" r="10" fill="#475569"/>
<circle cx="210" cy="180" r="10" fill="#475569"/>
<circle cx="255" cy="180" r="10" fill="#475569"/>"""
    write_svg("products/item_bracket_steel.svg", make_product_svg("BRACKET STEEL 4IN", "031200000", "031200000027", bracket))

    # 3. Foam Packing Block
    foam = """<rect x="120" y="40" width="160" height="150" rx="8" fill="#334155" stroke="#1e293b" stroke-width="3"/>
<rect x="150" y="70" width="40" height="40" fill="#1e293b"/>
<rect x="210" y="120" width="40" height="40" fill="#1e293b"/>
<text x="200" y="180" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" fill="#94a3b8" text-anchor="middle">EPE CUSHION BLOCK</text>"""
    write_svg("products/item_foam_packing.svg", make_product_svg("FOAM PACKING BLOCK", "012345678", "012345678905", foam))

    # 4. Tape Roll 2in
    tape = """<ellipse cx="200" cy="115" rx="75" ry="75" fill="#facc15" stroke="#ca8a04" stroke-width="4"/>
<ellipse cx="200" cy="115" rx="40" ry="40" fill="#d97706" stroke="#92400e" stroke-width="3"/>
<ellipse cx="200" cy="115" rx="25" ry="25" fill="#f8fafc"/>
<text x="200" y="120" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" font-weight="900" fill="#78350f" text-anchor="middle">2" STRAP</text>"""
    write_svg("products/item_tape_roll.svg", make_product_svg("TAPE ROLL 2IN INDUSTRIAL", "071050030", "071050030052", tape))

    # 5. Cable Tie Bag
    zip_ties = """<rect x="130" y="30" width="140" height="170" rx="6" fill="#ffffff" fill-opacity="0.4" stroke="#94a3b8" stroke-width="2"/>
<rect x="130" y="30" width="140" height="30" fill="#0284c7"/>
<text x="200" y="48" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="900" fill="#ffffff" text-anchor="middle">100-PACK NYLON TIES</text>
<line x1="150" y1="75" x2="250" y2="75" stroke="#000000" stroke-width="4"/>
<line x1="150" y1="95" x2="250" y2="95" stroke="#000000" stroke-width="4"/>
<line x1="150" y1="115" x2="250" y2="115" stroke="#000000" stroke-width="4"/>
<line x1="150" y1="135" x2="250" y2="135" stroke="#000000" stroke-width="4"/>
<line x1="150" y1="155" x2="250" y2="155" stroke="#000000" stroke-width="4"/>"""
    write_svg("products/item_cable_tie_bag.svg", make_product_svg("CABLE TIE BAG 100PK", "041333040", "041333040109", zip_ties))

    # 6. Label Sheet A4
    label_sheet = """<rect x="130" y="30" width="140" height="175" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
<rect x="140" y="45" width="55" height="35" rx="2" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1"/>
<rect x="205" y="45" width="55" height="35" rx="2" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1"/>
<rect x="140" y="90" width="55" height="35" rx="2" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1"/>
<rect x="205" y="90" width="55" height="35" rx="2" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1"/>
<rect x="140" y="135" width="55" height="35" rx="2" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1"/>
<rect x="205" y="135" width="55" height="35" rx="2" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1"/>"""
    write_svg("products/item_label_sheet.svg", make_product_svg("LOGISTICS LABEL SHEET A4", "052000002", "052000002107", label_sheet))

    # 7. Pallet Wrap Roll
    wrap_roll = """<rect x="160" y="35" width="80" height="150" rx="10" fill="#e2e8f0" fill-opacity="0.8" stroke="#94a3b8" stroke-width="2"/>
<rect x="185" y="10" width="30" height="200" rx="6" fill="#ca8a04" stroke="#78350f" stroke-width="2"/>
<text x="200" y="115" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="900" fill="#475569" text-anchor="middle" transform="rotate(-90, 200, 115)">80 GAUGE CAST</text>"""
    write_svg("products/item_pallet_wrap.svg", make_product_svg("PALLET WRAP ROLL 80G", "063200012", "063200012349", wrap_roll))

    # 8. Corner Protector
    corner_p = """<path d="M120,40 L160,25 L280,145 L240,160 Z" fill="#b45309" stroke="#78350f" stroke-width="2"/>
<path d="M120,40 L140,40 L260,160 L240,160 Z" fill="#78350f"/>
<text x="200" y="110" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="900" fill="#fef3c7">V-BOARD</text>"""
    write_svg("products/item_corner_protector.svg", make_product_svg("CORNER PROTECTOR V-BOARD", "074300010", "074300010041", corner_p))

    # 9. Bubble Wrap Sheet
    bubble = """<rect x="120" y="40" width="160" height="150" rx="8" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="2"/>
<circle cx="150" cy="70" r="14" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/>
<circle cx="190" cy="70" r="14" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/>
<circle cx="230" cy="70" r="14" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/>
<circle cx="170" cy="110" r="14" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/>
<circle cx="210" cy="110" r="14" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/>
<circle cx="250" cy="110" r="14" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/>"""
    write_svg("products/item_bubble_wrap.svg", make_product_svg("BUBBLE WRAP CUSHION SHEET", "085000009", "085000009008", bubble))

    # 10. Cardboard Insert
    insert_art = """<rect x="110" y="45" width="180" height="140" fill="#d97706" stroke="#92400e" stroke-width="3"/>
<line x1="170" y1="45" x2="170" y2="120" stroke="#78350f" stroke-width="4"/>
<line x1="230" y1="45" x2="230" y2="120" stroke="#78350f" stroke-width="4"/>
<text x="200" y="160" font-family="'Courier New', Courier, monospace" font-size="12" font-weight="900" fill="#fef3c7" text-anchor="middle">MULLEN 200# DIVIDER</text>"""
    write_svg("products/item_cardboard_insert.svg", make_product_svg("CARDBOARD INSERT DIVIDER", "096100025", "096100025003", insert_art))

    # 11. Bolt Set M8
    bolt_set = """<rect x="130" y="50" width="140" height="130" rx="8" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/>
<rect x="150" y="80" width="20" height="70" fill="#64748b"/>
<polygon points="145,80 175,80 160,65" fill="#475569"/>
<rect x="190" y="80" width="20" height="70" fill="#64748b"/>
<polygon points="185,80 215,80 200,65" fill="#475569"/>
<rect x="230" y="80" width="20" height="70" fill="#64748b"/>
<polygon points="225,80 255,80 240,65" fill="#475569"/>"""
    write_svg("products/item_bolt_set_m8.svg", make_product_svg("BOLT SET M8 (QTY 10)", "107200030", "107200030019", bolt_set))

    # 12. Washer Pack
    washer_p = """<rect x="140" y="35" width="120" height="165" rx="10" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
<circle cx="200" cy="50" r="6" fill="#64748b"/>
<circle cx="200" cy="115" r="35" fill="#94a3b8" stroke="#475569" stroke-width="3"/>
<circle cx="200" cy="115" r="14" fill="#f8fafc"/>
<text x="200" y="175" font-family="'Courier New', Courier, monospace" font-size="12" font-weight="900" fill="#334155" text-anchor="middle">QTY: 25 EA</text>"""
    write_svg("products/item_washer_pack.svg", make_product_svg("WASHER PACK M8 (QTY 25)", "118300015", "118300015012", washer_p))

    # 13. Nut Set M8
    nut_set = """<rect x="130" y="45" width="140" height="140" rx="8" fill="#ffffff" fill-opacity="0.5" stroke="#94a3b8" stroke-width="2"/>
<polygon points="160,80 180,70 200,80 200,100 180,110 160,100" fill="#94a3b8" stroke="#475569" stroke-width="2"/>
<circle cx="180" cy="90" r="6" fill="#3b82f6"/>
<polygon points="200,120 220,110 240,120 240,140 220,150 200,140" fill="#94a3b8" stroke="#475569" stroke-width="2"/>
<circle cx="220" cy="130" r="6" fill="#3b82f6"/>"""
    write_svg("products/item_nut_set_m8.svg", make_product_svg("NUT SET M8 NYLON (QTY 20)", "129400020", "129400020006", nut_set))

    # 14. Solvent Cleaner HAZMAT
    solvent = """<rect x="145" y="40" width="110" height="150" rx="8" fill="#94a3b8" stroke="#475569" stroke-width="3"/>
<rect x="180" y="15" width="40" height="25" fill="#ca8a04"/>
<!-- Flammable GHS Diamond -->
<polygon points="200,75 230,105 200,135 170,105" fill="#dc2626" stroke="#ffffff" stroke-width="2"/>
<path d="M195,115 Q200,90 205,115 Z" fill="#facc15"/>
<text x="200" y="165" font-family="'Courier New', Courier, monospace" font-size="11" font-weight="900" fill="#7f1d1d" text-anchor="middle">CLASS 3 FLAMMABLE</text>"""
    write_svg("products/item_solvent_cleaner.svg", make_product_svg("SOLVENT CLEANER 500ML (HAZ)", "140500035", "140500035034", solvent))

    # 15. Torque Wrench Blister Pack
    tw = """<rect x="120" y="30" width="160" height="180" rx="12" fill="#ffffff" stroke="#0284c7" stroke-width="2.5"/>
<line x1="160" y1="50" x2="240" y2="170" stroke="#475569" stroke-width="12" stroke-linecap="round"/>
<circle cx="160" cy="50" r="14" fill="#0f172a"/>
<text x="200" y="195" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="900" fill="#0284c7" text-anchor="middle">1/2" CLICK-STOP DRIVE</text>"""
    write_svg("products/item_torque_wrench.svg", make_product_svg("PRECISION TORQUE WRENCH 1/2IN", "024505590", "024505590010", tw))

    # 16. Heavy Duty Grease Gun
    gg = """<rect x="150" y="45" width="60" height="130" rx="6" fill="#15803d" stroke="#166534" stroke-width="2"/>
<path d="M210,65 L260,80 L210,95 Z" fill="#334155"/>
<path d="M180,45 Q210,10 240,45" fill="none" stroke="#000000" stroke-width="6"/>"""
    write_svg("products/item_grease_gun.svg", make_product_svg("PISTOL GREASE GUN 14OZ", "024505592", "024505592033", gg))

    # 17 & 18. Alpha-Pro vs Alpha-Lite (Twin Trap Packaging)
    pro = """<rect x="145" y="40" width="110" height="150" rx="12" fill="#cbd5e1" stroke="#64748b" stroke-width="3"/>
<rect x="180" y="20" width="40" height="20" fill="#334155"/>
<rect x="155" y="80" width="90" height="45" rx="3" fill="#0f172a"/>
<text x="200" y="100" font-family="'Courier New', Courier, monospace" font-size="10" font-weight="900" fill="#38bdf8" text-anchor="middle">ALPHA-PRO</text>
<text x="200" y="115" font-family="'Courier New', Courier, monospace" font-size="9" font-weight="900" fill="#ffffff" text-anchor="middle">CONCENTRATE</text>"""
    write_svg("products/item_alpha_pro.svg", make_product_svg("ALPHA-PRO SILVER 500ML", "024505580", "00024505580099", pro))

    lite = """<rect x="145" y="40" width="110" height="150" rx="12" fill="#cbd5e1" stroke="#64748b" stroke-width="3"/>
<rect x="180" y="20" width="40" height="20" fill="#334155"/>
<rect x="155" y="80" width="90" height="45" rx="3" fill="#0f172a"/>
<text x="200" y="100" font-family="'Courier New', Courier, monospace" font-size="10" font-weight="900" fill="#a3e635" text-anchor="middle">ALPHA-LITE</text>
<text x="200" y="115" font-family="'Courier New', Courier, monospace" font-size="9" font-weight="900" fill="#ffffff" text-anchor="middle">READY-TO-USE</text>"""
    write_svg("products/item_alpha_lite.svg", make_product_svg("ALPHA-LITE SILVER 500ML", "024505581", "00024505581088", lite))

    # Defect: Scratched Barcode
    scratched = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <rect x="10" y="10" width="380" height="380" rx="16" fill="#fef2f2" stroke="#ef4444" stroke-width="3"/>
  <rect x="10" y="10" width="380" height="36" rx="14" fill="#b91c1c"/>
  <text x="200" y="34" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="900" fill="#ffffff" text-anchor="middle">DEFECT: SCRATCHED BARCODE (CTRL+M)</text>

  <rect x="80" y="100" width="240" height="120" fill="#ffffff" stroke="#94a3b8" stroke-width="2"/>
  <!-- Barcode bars -->
  <line x1="100" y1="110" x2="100" y2="180" stroke="#000" stroke-width="4"/>
  <line x1="115" y1="110" x2="115" y2="180" stroke="#000" stroke-width="2"/>
  <line x1="130" y1="110" x2="130" y2="180" stroke="#000" stroke-width="6"/>
  <line x1="150" y1="110" x2="150" y2="180" stroke="#000" stroke-width="3"/>
  <line x1="170" y1="110" x2="170" y2="180" stroke="#000" stroke-width="5"/>
  <line x1="190" y1="110" x2="190" y2="180" stroke="#000" stroke-width="2"/>
  <line x1="210" y1="110" x2="210" y2="180" stroke="#000" stroke-width="4"/>
  <line x1="230" y1="110" x2="230" y2="180" stroke="#000" stroke-width="3"/>
  <line x1="250" y1="110" x2="250" y2="180" stroke="#000" stroke-width="6"/>
  <line x1="270" y1="110" x2="270" y2="180" stroke="#000" stroke-width="2"/>

  <!-- Heavy scratch lacerations -->
  <path d="M70,120 L330,170" stroke="#dc2626" stroke-width="7" stroke-linecap="round"/>
  <path d="M85,160 L310,130" stroke="#dc2626" stroke-width="6" stroke-linecap="round"/>

  <rect x="40" y="270" width="320" height="80" rx="8" fill="#18181b"/>
  <text x="200" y="300" font-family="'Courier New', Courier, monospace" font-size="14" font-weight="900" fill="#ef4444" text-anchor="middle">SCAN FAILED: UNREADABLE</text>
  <text x="200" y="325" font-family="'Courier New', Courier, monospace" font-size="12" font-weight="800" fill="#fca5a5" text-anchor="middle">PRESS CTRL+M FOR MANUAL OVERRIDE</text>
</svg>"""
    write_svg("products/item_defect_scratched.svg", scratched)

    # Defect: Crushed Carton
    crushed = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <rect x="10" y="10" width="380" height="380" rx="16" fill="#fffbeb" stroke="#f59e0b" stroke-width="3"/>
  <rect x="10" y="10" width="380" height="36" rx="14" fill="#b45309"/>
  <text x="200" y="34" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="900" fill="#ffffff" text-anchor="middle">DEFECT: CRUSHED CARTON (CTRL+D)</text>

  <!-- Crushed, collapsed accordion box -->
  <path d="M100,100 L280,70 L320,180 L260,220 L120,240 L80,180 Z" fill="#d97706" stroke="#78350f" stroke-width="3"/>
  <!-- Burst creased seam -->
  <path d="M180,85 L190,150 L140,210" stroke="#451a03" stroke-width="4"/>
  <path d="M220,130 L280,160" stroke="#451a03" stroke-width="4"/>

  <rect x="40" y="270" width="320" height="80" rx="8" fill="#18181b"/>
  <text x="200" y="300" font-family="'Courier New', Courier, monospace" font-size="14" font-weight="900" fill="#f59e0b" text-anchor="middle">QA QUARANTINE REQUIRED</text>
  <text x="200" y="325" font-family="'Courier New', Courier, monospace" font-size="12" font-weight="800" fill="#fef3c7" text-anchor="middle">PRESS CTRL+D TO TAG BAD ORDER</text>
</svg>"""
    write_svg("products/item_defect_crushed.svg", crushed)

    # Defect: Hazmat Leaking Puncture
    leaking = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <rect x="10" y="10" width="380" height="380" rx="16" fill="#fef2f2" stroke="#dc2626" stroke-width="3"/>
  <rect x="10" y="10" width="380" height="36" rx="14" fill="#991b1b"/>
  <text x="200" y="34" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="900" fill="#ffffff" text-anchor="middle">HAZMAT SPILL ALERT (CTRL+H)</text>

  <!-- Punctured aerosol / solvent tin -->
  <rect x="150" y="80" width="100" height="130" rx="8" fill="#64748b" stroke="#334155" stroke-width="3"/>
  <!-- Puncture hole -->
  <circle cx="210" cy="140" r="10" fill="#000000"/>
  <!-- Leaking puddle & drips -->
  <path d="M210,150 Q230,190 200,220 Q170,240 120,220 Q90,200 130,180 Z" fill="#eab308" opacity="0.8"/>
  <path d="M210,140 Q250,110 270,80" stroke="#facc15" stroke-width="4" stroke-dasharray="4 4"/>

  <rect x="40" y="270" width="320" height="80" rx="8" fill="#18181b"/>
  <text x="200" y="300" font-family="'Courier New', Courier, monospace" font-size="14" font-weight="900" fill="#ef4444" text-anchor="middle">SAFETY STOP: CHEMICAL LEAK</text>
  <text x="200" y="325" font-family="'Courier New', Courier, monospace" font-size="12" font-weight="800" fill="#fca5a5" text-anchor="middle">PRESS CTRL+H -> TOTE-09-HAZ</text>
</svg>"""
    write_svg("products/item_defect_leaking.svg", leaking)

# ─────────────────────────────────────────────────────────────────────────────
# 4. UI RETICLES & MAPS
# ─────────────────────────────────────────────────────────────────────────────

def build_ui():
    # Scan Beam Reticle (Red 650nm)
    reticle_scan = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
  <defs>
    <filter id="redBeamGlow">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <!-- 4 Corner Brackets -->
  <path d="M40,70 L40,40 L70,40" fill="none" stroke="#ef4444" stroke-width="4"/>
  <path d="M200,70 L200,40 L170,40" fill="none" stroke="#ef4444" stroke-width="4"/>
  <path d="M40,170 L40,200 L70,200" fill="none" stroke="#ef4444" stroke-width="4"/>
  <path d="M200,170 L200,200 L170,200" fill="none" stroke="#ef4444" stroke-width="4"/>

  <!-- 650nm Horizontal Scan Beam Sweep Line -->
  <line x1="20" y1="120" x2="220" y2="120" stroke="#ff0033" stroke-width="4" filter="url(#redBeamGlow)"/>
  <line x1="20" y1="120" x2="220" y2="120" stroke="#ffffff" stroke-width="1.5"/>
  <!-- Targeting Crosshair -->
  <circle cx="120" cy="120" r="16" fill="none" stroke="#ef4444" stroke-width="2"/>
</svg>"""
    write_svg("ui/ui_reticle_scan_beam.svg", reticle_scan)

    # Success Reticle (Green 520nm)
    reticle_success = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
  <circle cx="120" cy="120" r="80" fill="#052e16" fill-opacity="0.3" stroke="#22c55e" stroke-width="4"/>
  <path d="M80,120 L110,150 L165,95" fill="none" stroke="#22c55e" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="120" cy="120" r="95" fill="none" stroke="#22c55e" stroke-width="2" stroke-dasharray="8 6"/>
</svg>"""
    write_svg("ui/ui_reticle_lock_success.svg", reticle_success)

    # Error Reticle (Red Alert Octagon)
    reticle_error = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
  <polygon points="80,40 160,40 200,80 200,160 160,200 80,200 40,160 40,80" fill="#450a0a" fill-opacity="0.4" stroke="#ef4444" stroke-width="5"/>
  <line x1="85" y1="85" x2="155" y2="155" stroke="#ef4444" stroke-width="8" stroke-linecap="round"/>
  <line x1="155" y1="85" x2="85" y2="155" stroke="#ef4444" stroke-width="8" stroke-linecap="round"/>
</svg>"""
    write_svg("ui/ui_reticle_lock_error.svg", reticle_error)

    # Blueprint Facility Map (960x560)
    blueprint_map = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 560" width="960" height="560">
  <rect width="960" height="560" fill="#081426"/>
  <!-- Architectural Blueprint Grid -->
  <defs>
    <pattern id="blueGrid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0f2b4c" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="960" height="560" fill="url(#blueGrid)"/>

  <!-- Facility Outer Perimeter Walls -->
  <rect x="28" y="34" width="904" height="498" fill="none" stroke="#38bdf8" stroke-width="3"/>

  <!-- Zones Z1 to Z4 -->
  <!-- Zone 1 (Aisle 316) -->
  <rect x="70" y="76" width="182" height="150" rx="8" fill="#0c2340" stroke="#38bdf8" stroke-width="2"/>
  <text x="161" y="140" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="900" fill="#ffffff" text-anchor="middle">ZONE 1</text>
  <text x="161" y="165" font-family="'Courier New', Courier, monospace" font-size="13" font-weight="800" fill="#38bdf8" text-anchor="middle">AISLE 316</text>

  <!-- Zone 2 (Aisle 412) -->
  <rect x="270" y="76" width="182" height="150" rx="8" fill="#0c2340" stroke="#38bdf8" stroke-width="2"/>
  <text x="361" y="140" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="900" fill="#ffffff" text-anchor="middle">ZONE 2</text>
  <text x="361" y="165" font-family="'Courier New', Courier, monospace" font-size="13" font-weight="800" fill="#38bdf8" text-anchor="middle">AISLE 412</text>

  <!-- Zone 3 (Aisle 508) -->
  <rect x="470" y="76" width="182" height="150" rx="8" fill="#0c2340" stroke="#38bdf8" stroke-width="2"/>
  <text x="561" y="140" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="900" fill="#ffffff" text-anchor="middle">ZONE 3</text>
  <text x="561" y="165" font-family="'Courier New', Courier, monospace" font-size="13" font-weight="800" fill="#38bdf8" text-anchor="middle">AISLE 508</text>

  <!-- Zone 4 (Aisle 612) -->
  <rect x="670" y="76" width="182" height="150" rx="8" fill="#0c2340" stroke="#38bdf8" stroke-width="2"/>
  <text x="761" y="140" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="900" fill="#ffffff" text-anchor="middle">ZONE 4</text>
  <text x="761" y="165" font-family="'Courier New', Courier, monospace" font-size="13" font-weight="800" fill="#38bdf8" text-anchor="middle">AISLE 612</text>

  <!-- Command Center (CSR / Tasker Dispatch) -->
  <rect x="150" y="300" width="300" height="120" rx="8" fill="#0f172a" stroke="#f59e0b" stroke-width="2.5"/>
  <text x="300" y="355" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="900" fill="#f59e0b" text-anchor="middle">COMMAND CENTER</text>
  <text x="300" y="380" font-family="'Courier New', Courier, monospace" font-size="12" font-weight="800" fill="#cbd5e1" text-anchor="middle">TASKER / CSR / DISPATCH DESK</text>

  <!-- Hazmat Segregation Zone (Aisle 900) -->
  <rect x="628" y="286" width="224" height="148" rx="8" fill="#451a03" stroke="#eab308" stroke-width="2.5"/>
  <text x="740" y="355" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="900" fill="#fef08a" text-anchor="middle">HAZMAT ZONE</text>
  <text x="740" y="380" font-family="'Courier New', Courier, monospace" font-size="12" font-weight="800" fill="#fef3c7" text-anchor="middle">AISLE 900 (CHEM STORAGE)</text>

  <!-- Putwall Conveyor Line -->
  <rect x="70" y="482" width="782" height="36" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
  <text x="461" y="506" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2">OUTBOUND TAKEAWAY CONVEYOR INDUCTION LINE</text>
</svg>"""
    write_svg("ui/map_blueprint_facility.svg", blueprint_map)

    # Serpentine Route Map (280x250)
    serpentine_map = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 250" width="280" height="250">
  <rect width="280" height="250" rx="10" fill="#090d16" stroke="#1e293b" stroke-width="2"/>
  <!-- Corridor Center Walkway -->
  <rect x="90" y="15" width="100" height="220" fill="#0f172a" stroke="#334155" stroke-dasharray="4 4"/>
  
  <!-- Bays 01 to 04 indicators -->
  <text x="35" y="45" font-family="'Courier New', Courier, monospace" font-size="10" font-weight="800" fill="#64748b">BAY 01</text>
  <text x="35" y="105" font-family="'Courier New', Courier, monospace" font-size="10" font-weight="800" fill="#64748b">BAY 02</text>
  <text x="35" y="165" font-family="'Courier New', Courier, monospace" font-size="10" font-weight="800" fill="#64748b">BAY 03</text>
  <text x="35" y="225" font-family="'Courier New', Courier, monospace" font-size="10" font-weight="800" fill="#64748b">BAY 04</text>

  <!-- Serpentine S-Curve Pick Path (Gold/Amber) -->
  <path d="M140,25 L45,45 L140,75 L235,105 L140,135 L45,165 L140,195 L235,225" fill="none" stroke="#f59e0b" stroke-width="3" stroke-dasharray="5 3"/>

  <!-- Pick Waypoint Nodes -->
  <circle cx="45" cy="45" r="7" fill="#10b981"/>
  <circle cx="235" cy="105" r="7" fill="#10b981"/>
  <circle cx="45" cy="165" r="7" fill="#10b981"/>
  <circle cx="235" cy="225" r="7" fill="#ef4444"/>

  <!-- Current Cart Indicator on Path -->
  <circle cx="140" cy="135" r="11" fill="#38bdf8" stroke="#ffffff" stroke-width="3"/>
  <text x="140" y="139" font-family="'Courier New', Courier, monospace" font-size="10" font-weight="900" fill="#000000" text-anchor="middle">C</text>
</svg>"""
    write_svg("ui/map_serpentine_route.svg", serpentine_map)

def main():
    print("=== Starting Autonomous Vector Asset Generation ===")
    ensure_dirs()
    build_barcodes()
    build_equipment()
    build_products()
    build_ui()
    print("=== All Vector Assets Generated Successfully! ===")

if __name__ == "__main__":
    main()
