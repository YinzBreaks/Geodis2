#!/usr/bin/env python3
"""
GEODIS Nashville Simulation — Autonomous Asset Generation Engine
================================================================
Batch generator for photorealistic environments, industrial equipment,
SKU inventory items, and defect edge cases.

Anchor Specifications:
- Facility: GEODIS Multi-Client Campus, Lebanon / Mt. Juliet, TN (Hwy 109 / Park 840)
- Lighting: 5000K Daylight-White High-Bay LED (Lithonia I-BEAM series), shadow-free
- Color Standards: GEODIS Blue (#004A99), OSHA Safety Yellow (#FFCC00), Industrial Slate (#1E293B)
- Concrete: Diamond-polished 4000 PSI slab with lithium silicate densifier & subtle specular bounce

Usage:
    python generate_assets.py --dry-run
    python generate_assets.py --category environments --api imagen --api-key YOUR_KEY
    python generate_assets.py --category all --render-placeholders
"""

import argparse
import base64
import json
import os
import sys
import time
from pathlib import Path
from typing import Dict, Any, List

try:
    from PIL import Image, ImageDraw, ImageFont
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

# Base workspace directory
WORKSPACE_ROOT = Path(__file__).resolve().parent
PUBLIC_DIR = WORKSPACE_ROOT / "public" / "assets"

# Master Asset Catalog
ASSET_CATALOG: List[Dict[str, Any]] = [
    # -------------------------------------------------------------------------
    # PHOTOREALISTIC ENVIRONMENTS (16:9, 1920x1080)
    # -------------------------------------------------------------------------
    {
        "id": "inbound_dock_plate",
        "category": "environments",
        "output_path": "simulation/inbound_dock_plate.jpg",
        "resolution": (1920, 1080),
        "aspect_ratio": "16:9",
        "prompt": (
            "Ultra-photorealistic eye-level architectural interior view of the Inbound Receiving Dock "
            "inside a modern GEODIS distribution center in Nashville, Tennessee. Several industrial roll-up "
            "overhead bay doors line the exterior wall. Two bays are open with heavy-duty blue hydraulic dock levelers "
            "deployed into the floor of 53-foot dry van freight trailers. The floor is diamond-polished industrial gray "
            "concrete with clear specular reflections and bold 4-inch OSHA safety yellow boundary striping with 45-degree "
            "hazard hatching. Stacks of staged wooden GMA 48x40 pallets securely shrink-wrapped in transparent stretch film "
            "sit along the staging lane. Crisp, shadow-free 5000K daylight-white LED high-bay luminaires illuminate the high ceiling. "
            "Heavy steel structural building columns are wrapped with vibrant corporate GEODIS blue (#004A99) collision-bollard shields. "
            "Mechanical dock door tracks, red-green safety dock status lights, and industrial barcoded staging signs are visible in sharp focus. "
            "Hasselblad H6D-100c, 24mm f/8 lens, architectural perspective, 8k resolution, crisp photorealism."
        ),
        "negative_prompt": (
            "blurry, low quality, dark, moody, warm incandescent lighting, dramatic shadows, cartoon, render, "
            "distorted doors, floating objects, people, clutter, trash, grime, graffiti"
        ),
        "camera": "24mm architectural tilt-shift, f/8, ISO 100",
        "lighting": "5000K cool daylight high-bay LED, uniform 45 foot-candles, zero harsh shadows"
    },
    {
        "id": "aisle_plate",
        "category": "environments",
        "output_path": "simulation/aisle_plate.jpg",
        "resolution": (1920, 1080),
        "aspect_ratio": "16:9",
        "prompt": (
            "Ultra-photorealistic interior perspective looking straight down selective pallet racking Aisle 316 "
            "in a modern GEODIS fulfillment center in Mt. Juliet, Tennessee. Towering 36-foot clear height industrial steel teardrop "
            "pallet racks flank both sides with bright safety orange cross-beams and galvanized wire mesh decking. Racks are loaded "
            "with uniform corrugated master cartons on wooden GMA pallets. The polished gray concrete floor has OSHA safety yellow "
            "stripes running parallel down the center aisle. Overhead linear 5000K industrial LED light fixtures cast bright, shadowless "
            "daylight illumination across every rack face. White retro-reflective shelf location tags (ALOC) with black Code 128 barcodes "
            "and bold reverse-contrast check digit boxes are crisply visible on each beam tier. Depth of field extends down the pristine, "
            "highly organized 300-foot aisle corridor. Sony A7R V, 28mm f/8, photorealistic warehouse architecture."
        ),
        "negative_prompt": (
            "cluttered floor, dirty, damaged racks, warm yellow light, dark corners, motion blur, CGI artifacts, "
            "crooked beams, misaligned shelves, oversaturated colors"
        ),
        "camera": "28mm wide angle, f/8, ISO 100, eye-level perspective",
        "lighting": "5000K daylight LED continuous rack aisle luminaire, 40 foot-candles"
    },
    {
        "id": "conveyor_plate",
        "category": "environments",
        "output_path": "simulation/conveyor_plate.jpg",
        "resolution": (1920, 1080),
        "aspect_ratio": "16:9",
        "prompt": (
            "Photorealistic high-fidelity eye-level view of an industrial motorized takeaway roller conveyor induction station "
            "inside a GEODIS multi-client distribution facility. Heavy-duty galvanized steel conveyor bed with precision zinc rollers, "
            "blue powder-coated side guard rails, red emergency stop pull cables, and retro-reflective photo-eye accumulation sensors. "
            "Standard industrial gray polypropylene storage totes (24x16x12 inches) move smoothly along the powered roller line. "
            "In the background, an overhead LED status placard reads 'PUTWALL 01 - INDUCTION ACTIVE' in crisp white and GEODIS blue (#004A99). "
            "The polished concrete floor reflects the 5000K high-bay overhead LED lighting. Clean, modern logistics engineering, pristine industrial aesthetic. "
            "Canon EOS R5, 35mm f/5.6 lens, crisp focus, commercial logistics photography."
        ),
        "negative_prompt": (
            "jammed conveyor, broken rollers, dust, rustic, dark industrial, oil stains, rusty metal, "
            "glare blowout, distorted geometry, cartoonish textures"
        ),
        "camera": "35mm f/5.6, eye-level 3/4 perspective, ISO 100",
        "lighting": "5000K diffuse commercial high-bay illumination, balanced fill"
    },
    {
        "id": "hazmat_staging_bay",
        "category": "environments",
        "output_path": "simulation/hazmat_staging_bay.jpg",
        "resolution": (1920, 1080),
        "aspect_ratio": "16:9",
        "prompt": (
            "Ultra-photorealistic eye-level view of a dedicated Hazardous Materials (Hazmat) staging and containment bay "
            "inside a GEODIS distribution center in Lebanon, TN. The bay features an OSHA-compliant yellow epoxy floor coating "
            "with a raised 4-inch containment berm for spill control. An emergency eye-wash and safety deluge shower station "
            "with high-visibility green-and-white safety signage stands mounted to a steel column. Prominent DOT Class 3 Flammable "
            "Liquid diamond warning placards and EPA containment regulations are mounted to the wall. Staged yellow hazmat "
            "segregation totes (TOTE-09-HAZ) and heavy-duty polyethylene spill recovery drums are staged neatly. Overhead 5000K vapor-tight "
            "LED safety fixtures illuminate the clean, rigorously maintained hazardous isolation zone. 8k resolution, crisp commercial realism."
        ),
        "negative_prompt": (
            "dirty spills, fire, smoke, danger, chaotic, neglected, messy, dark shadows, dramatic horror lighting, "
            "distorted signs, unreadable text"
        ),
        "camera": "28mm f/8, architectural wide perspective, ISO 100",
        "lighting": "5000K vapor-proof LED safety high-bay, bright 50 foot-candles"
    },

    # -------------------------------------------------------------------------
    # MATERIAL HANDLING & WEARABLE EQUIPMENT (4:3 & 1:1)
    # -------------------------------------------------------------------------
    {
        "id": "pick_cart_photoreal",
        "category": "equipment",
        "output_path": "equipment/pick_cart_photoreal.png",
        "resolution": (1024, 768),
        "aspect_ratio": "4:3",
        "prompt": (
            "Studio product photograph of a National Cart Co. industrial 3-tier tubular aluminum order picking cart "
            "on an isolated pure white background. The cart features three stepped wire shelves designed to hold 9 standard 24x16x12 "
            "industrial storage totes. Heavy-duty 5-inch polyurethane swivel casters with total-lock foot brakes at the base. "
            "Ergonomic handle grip on the rear mast with an integrated clipboard holder, document pouch, and barcode placard reading "
            "'CART-04' with a crisp Code 128 barcode. High-grade brushed aluminum tubing with clean TIG welds. Neutral 5000K commercial "
            "studio lighting, soft ground contact shadow, clean 3/4 isometric perspective. Commercial catalog quality, 8k resolution."
        ),
        "negative_prompt": (
            "background warehouse, people, dirt, rust, scratches, bent bars, chromatic aberration, cartoon, 3d render look"
        ),
        "camera": "70mm macro, f/8, studio isolation, neutral ground shadow",
        "lighting": "5000K studio softboxes, balanced fill, zero harsh reflections"
    },
    {
        "id": "tote_standard_photoreal",
        "category": "equipment",
        "output_path": "equipment/tote_standard_photoreal.png",
        "resolution": (800, 600),
        "aspect_ratio": "4:3",
        "prompt": (
            "Studio product photograph of an Orbis 24x16x12 inch heavy-duty industrial FliPak attached-lid storage container (tote) "
            "in industrial slate gray polypropylene plastic on an isolated neutral background. Interlocking textured hinged lid panels, "
            "molded ergonomic hand grips on both ends, ribbed side wall structural reinforcement, and recessed textured label areas. "
            "Front face features a clean white logistics barcode tag reading 'TOTE-01' with a Code 128 barcode. Subtle surface texture "
            "of injection-molded high-density polypropylene. Commercial 5000K softbox lighting, soft contact shadow, 3/4 elevated perspective."
        ),
        "negative_prompt": (
            "cracked plastic, dirty, warehouse background, harsh shadows, warped shape, glossy shiny cheap plastic"
        ),
        "camera": "85mm macro, f/8, studio isolation",
        "lighting": "5000K studio softbox, diffuse matte reflection"
    },
    {
        "id": "tote_hazmat_photoreal",
        "category": "equipment",
        "output_path": "equipment/tote_hazmat_photoreal.png",
        "resolution": (800, 600),
        "aspect_ratio": "4:3",
        "prompt": (
            "Studio product photograph of an OSHA-compliant high-visibility safety yellow industrial attached-lid storage tote "
            "isolated on a clean background. Molded heavy-duty HDPE construction with textured interlocking lid. Bold black-and-yellow "
            "hazard chevron diagonal warning striping on the side walls. A high-contrast inverted black barcode placard reads "
            "'TOTE-09-HAZ' with an authentic Code 128 symbology barcode and a DOT Class 3 Flammable Liquid red warning diamond decal. "
            "Pristine commercial product photography, 5000K studio lighting, soft floor shadow, 8k resolution."
        ),
        "negative_prompt": (
            "damaged, chemical spill, dirty, blurred barcode, warehouse clutter, distorted text"
        ),
        "camera": "85mm macro, f/8, studio isolation",
        "lighting": "5000K soft studio illumination, anti-glare polarization"
    },
    {
        "id": "wearable_terminal_photoreal",
        "category": "equipment",
        "output_path": "equipment/wearable_terminal_photoreal.png",
        "resolution": (1024, 768),
        "aspect_ratio": "4:3",
        "prompt": (
            "Product macro studio shot of a Symbol/Zebra WT4090 rugged industrial wearable mobile computer on an isolated background. "
            "Durable matte black rubberized elastomer overmold chassis with a landscape-oriented 3.2-inch transflective color LCD display. "
            "Under the screen is a 23-key tactile alphanumeric silicone keypad with backlit keys, dedicated Enter key, and function buttons. "
            "Three multi-color LED status indicators (Decode, Battery, Network) above the screen. Heavy-duty breathable wrist strap with dual "
            "cam-buckle nylon fasteners. Screen is illuminated showing a clean green text WMS terminal prompt: 'LOC: 316-01-A-01 | SCAN CARTON'. "
            "Macro photography, crisp tactile details, authentic industrial handheld engineering."
        ),
        "negative_prompt": (
            "scratched screen, cracked casing, worn out keys, blurred labels, human arm, modern consumer smartphone"
        ),
        "camera": "100mm macro f/11, studio tabletop isolation",
        "lighting": "5000K studio rim and key lighting, non-reflective screen polarizer"
    },
    {
        "id": "ring_scanner_photoreal",
        "category": "equipment",
        "output_path": "equipment/ring_scanner_photoreal.png",
        "resolution": (800, 800),
        "aspect_ratio": "1:1",
        "prompt": (
            "Macro product photograph of a Zebra RS5100 rugged Bluetooth 2D industrial ring scanner isolated on a white background. "
            "Compact low-profile polycarbonate body in textured matte black. Single-finger dual-strap mount with ambidextrous trigger button. "
            "The optical scan window is recessed with clear anti-scratch glass emitting a crisp green LED crosshair aiming pattern. "
            "Top-mounted bivector good-decode confirmation LED ring glowing softly emerald green. Crisp molded Zebra branding, serial numbers, "
            "and contact charge pins. Commercial hardware product catalog photography, 5000K diffuse lighting, 8k resolution."
        ),
        "negative_prompt": (
            "hand holding scanner, dirty, damaged rubber, unreadable logos, glare reflection"
        ),
        "camera": "100mm f/8 macro lens, studio isolation",
        "lighting": "5000K diffuse softbox, subtle rim light"
    },
    {
        "id": "reach_truck_photoreal",
        "category": "equipment",
        "output_path": "equipment/reach_truck_photoreal.png",
        "resolution": (1024, 1024),
        "aspect_ratio": "1:1",
        "prompt": (
            "Commercial industrial catalog photograph of a Crown SP 4000 Series electric order picker / Raymond 7000 reach truck "
            "isolated on a neutral background. Heavy-duty mast with nested I-beams, hydraulic lift cylinders, and heavy steel outriggers. "
            "Operator compartment features a non-slip padded safety platform, ergonomic multi-task control handle, steering tiller, "
            "and wire-mesh overhead guard. Crown corporate beige and safety orange accent livery with bold black safety decals. "
            "High-load polyurethane drive wheel and load casters at the base. 5000K clean commercial studio lighting, 3/4 isometric perspective."
        ),
        "negative_prompt": (
            "warehouse background, driver, scratches, rust, dirt, skewed mast, cartoon"
        ),
        "camera": "50mm f/8, 3/4 elevation perspective, studio isolation",
        "lighting": "5000K diffuse studio lighting, soft floor shadow"
    },

    # -------------------------------------------------------------------------
    # SKU INVENTORY & RETAIL OBJECTS (1:1, 800x800)
    # -------------------------------------------------------------------------
    {
        "id": "item_widget_alpha_photoreal",
        "category": "products",
        "output_path": "products/item_widget_alpha_photoreal.png",
        "resolution": (800, 800),
        "aspect_ratio": "1:1",
        "prompt": (
            "Commercial product studio photograph of a 250ml high-density polyethylene (HDPE) industrial dispensing bottle "
            "in vibrant cobalt blue with a black ribbed screw cap and precision tip dispenser, isolated on white. High-contrast white "
            "vinyl product label wrapped around the body with crisp black typography: 'ALPHA DISPENSER 250ML | SKU: 024505572' "
            "and a scannable 12-digit UPC-A barcode '024505572001'. Subtle matte plastic specular reflection, 5000K softbox studio lighting, "
            "subtle contact drop shadow. Professional e-commerce packaging photograph."
        ),
        "negative_prompt": "scratches, dents, dust, dark lighting, warm tones, messy background",
        "camera": "85mm macro f/8",
        "lighting": "5000K dual softboxes"
    },
    {
        "id": "item_bracket_steel_photoreal",
        "category": "products",
        "output_path": "products/item_bracket_steel_photoreal.png",
        "resolution": (800, 800),
        "aspect_ratio": "1:1",
        "prompt": (
            "Studio product photograph of a 4-inch heavy-duty structural steel 90-degree angle bracket with bright electro-galvanized "
            "zinc plating, isolated on neutral light gray. Stamped pre-drilled mounting holes, rounded deburred edges, and crisp metal stamping "
            "indentations. A clean white removable logistics label is adhered to the outer face displaying SKU '031200000' and UPC barcode '031200000027'. "
            "Crisp metallic sheen, realistic brushed zinc spangle pattern, 5000K commercial studio lighting, sharp focus."
        ),
        "negative_prompt": "rust, bent metal, rough burrs, dark reflections, low res",
        "camera": "85mm macro f/11",
        "lighting": "5000K balanced commercial fill"
    },
    {
        "id": "item_solvent_cleaner_photoreal",
        "category": "products",
        "output_path": "products/item_solvent_cleaner_photoreal.png",
        "resolution": (800, 800),
        "aspect_ratio": "1:1",
        "prompt": (
            "Studio product photography of a 500ml industrial rectangular fluted tin solvent can with a child-resistant red metal screw cap, "
            "isolated on white. The tin body features a high-visibility yellow and red industrial safety label reading: 'INDUSTRIAL SOLVENT CLEANER - "
            "FAST EVAPORATING | SKU: 140500035 | UPC: 140500035034'. Prominent OSHA GHS Class 3 Flammable Liquid red border diamond hazard decal "
            "with flame symbol. Highly reflective metallic seams and crimped tin rim. Commercial catalog quality, 5000K studio illumination."
        ),
        "negative_prompt": "dents, leaking, dirty, illegible label, warm color cast",
        "camera": "85mm macro f/8",
        "lighting": "5000K anti-reflective softbox"
    },
    {
        "id": "item_torque_wrench_photoreal",
        "category": "products",
        "output_path": "products/item_torque_wrench_photoreal.png",
        "resolution": (800, 800),
        "aspect_ratio": "1:1",
        "prompt": (
            "Studio product photograph of a professional 1/2-inch drive reversible click-type industrial torque wrench in a high-impact "
            "contoured clear blister pack with red cardboard backing, isolated on white. Mirror chrome finish on the forged vanadium steel shaft, "
            "laser-etched foot-pound and Newton-meter torque scales, and black knurled aluminum locking handle. Retail packaging header features "
            "a crisp white barcode sticker with SKU '024505590' and UPC '024505590010'. 5000K studio strobe lighting, razor-sharp focus."
        ),
        "negative_prompt": "blister pack reflections hiding tool, scuffed plastic, scratches",
        "camera": "85mm f/8 macro",
        "lighting": "5000K polarized studio softbox"
    },
    {
        "id": "item_alpha_pro_photoreal",
        "category": "products",
        "output_path": "products/item_alpha_pro_photoreal.png",
        "resolution": (800, 800),
        "aspect_ratio": "1:1",
        "prompt": (
            "Studio product photograph of a 500ml cylindrical extruded aluminum chemical canister with a threaded blue tamper-evident seal cap, "
            "isolated on white. High-gloss silver metallic canister body with a dark blue label badge: 'ALPHA PRO CONCENTRATE - FORMULA A1 | "
            "SKU: 024505580 | GTIN: 00024505580099'. Clear scannable 14-digit GS1 barcode block with human-readable interpretation. "
            "Sharp metallic specular reflections under 5000K daylight-white studio strobes, clean studio drop shadow."
        ),
        "negative_prompt": "matte finish, warm tones, crumpled label, blurred numbers",
        "camera": "85mm macro f/8",
        "lighting": "5000K balanced studio key and rim"
    },
    {
        "id": "item_alpha_lite_photoreal",
        "category": "products",
        "output_path": "products/item_alpha_lite_photoreal.png",
        "resolution": (800, 800),
        "aspect_ratio": "1:1",
        "prompt": (
            "Studio product photograph of a 500ml cylindrical extruded aluminum chemical canister identical in shape to Alpha Pro, "
            "but featuring a light cyan-blue cap and white label badge with cyan typography: 'ALPHA LITE READY-TO-USE - FORMULA A2 | "
            "SKU: 024505581 | GTIN: 00024505581088'. Scannable GS1 barcode at bottom center. Subtle reverse-contrast twin trap visual cue "
            "for warehouse picker verification training. Isolated on pure white, 5000K daylight commercial lighting."
        ),
        "negative_prompt": "dark blue cap, identical label to alpha pro, scratches, dust",
        "camera": "85mm macro f/8",
        "lighting": "5000K studio softbox"
    },

    # -------------------------------------------------------------------------
    # DEFECT & EXCEPTION STATES (1:1, 800x800)
    # -------------------------------------------------------------------------
    {
        "id": "defect_scratched_barcode_photoreal",
        "category": "defects",
        "output_path": "products/defect_scratched_barcode.png",
        "resolution": (800, 800),
        "aspect_ratio": "1:1",
        "prompt": (
            "High-resolution macro photograph of a thermal paper logistics carton barcode label severely damaged by abrasion and scratching. "
            "A deep diagonal tear and rough white surface scratch gouges across the black vertical Code 128 barcode bars, rendering the central "
            "half unreadable by laser optical scanners. The human-readable text '024505572001' remains partially legible below the gouge. "
            "The label is adhered to standard brown corrugated kraft cardboard. Extreme macro texture showing torn paper fibers and scraped black thermal ink. "
            "Neutral 5000K inspection lighting, razor-sharp focus."
        ),
        "negative_prompt": "clean barcode, perfect lines, computer generated vector lines, blurry, out of focus",
        "camera": "100mm macro f/11, raking angle inspection light",
        "lighting": "5000K high-CRI inspection ring light"
    },
    {
        "id": "defect_crushed_carton_photoreal",
        "category": "defects",
        "output_path": "products/defect_crushed_carton.png",
        "resolution": (800, 800),
        "aspect_ratio": "1:1",
        "prompt": (
            "High-resolution studio photograph of a heavily damaged corrugated cardboard shipping carton isolated on white. "
            "One top corner is violently caved in with deep accordion crumple creases, split fiber tape, and a burst side seam "
            "revealing crumpled interior bubble wrap. Realistic ISTA impact drop damage with compressed fluting and buckled corrugated kraft walls. "
            "A standard shipping label on the crushed side is distorted and warped across the crease. 5000K commercial studio lighting, sharp detail."
        ),
        "negative_prompt": "pristine carton, intact corners, smooth cardboard, 3d low poly model, cartoon",
        "camera": "85mm macro f/8, 3/4 perspective",
        "lighting": "5000K high-bay daylight fill"
    },
    {
        "id": "defect_leaking_hazmat_photoreal",
        "category": "defects",
        "output_path": "products/defect_leaking_hazmat.png",
        "resolution": (800, 800),
        "aspect_ratio": "1:1",
        "prompt": (
            "High-resolution close-up photograph of a damaged 500ml metal solvent tin canister with a sharp puncture dent near the bottom seam. "
            "A clear, volatile liquid solvent is actively weeping and pooling on a yellow polypropylene spill containment tray below. "
            "The red flammable liquid diamond hazard label is peeling and discolored where the solvent dissolved the adhesive. "
            "Glossy specular wet reflections in the spreading puddle, realistic surface tension droplets around the puncture point. "
            "5000K industrial safety inspection lighting, crisp macro realism."
        ),
        "negative_prompt": "fire, smoke, colorful sludge, cartoon, blood, pristine can",
        "camera": "100mm macro f/8",
        "lighting": "5000K high-CRI raking safety light"
    }
]


def render_procedural_plate(asset: Dict[str, Any], output_file: Path) -> bool:
    """
    Renders a high-fidelity procedural texture plate using PIL when external API is offline.
    Incorporates 5000K daylight-white tones, GEODIS blue (#004A99), OSHA striping, and metadata stamps.
    """
    if not HAS_PIL:
        print(f"[WARN] PIL not installed. Skipping procedural render for {asset['id']}")
        return False

    width, height = asset["resolution"]
    img = Image.new("RGB", (width, height), color=(26, 32, 44))
    draw = ImageDraw.Draw(img)

    cat = asset["category"]

    if cat == "environments":
        # Background gradient: high ceiling to polished floor
        for y in range(height):
            ratio = y / height
            if ratio < 0.45:
                # High ceiling steel structure
                r = int(24 + ratio * 20)
                g = int(30 + ratio * 25)
                b = int(45 + ratio * 35)
            elif ratio < 0.55:
                # Horizon / eye level
                r, g, b = 40, 50, 68
            else:
                # Polished 5000K concrete floor with specular bounce
                f_ratio = (ratio - 0.55) / 0.45
                r = int(50 + f_ratio * 40)
                g = int(60 + f_ratio * 45)
                b = int(75 + f_ratio * 50)
            draw.line([(0, y), (width, y)], fill=(r, g, b))

        # Perspective floor grid lines
        center_x = width // 2
        horizon_y = int(height * 0.52)
        for i in range(-5, 6):
            start_x = center_x + i * int(width * 0.18)
            draw.line([(center_x + i * 20, horizon_y), (start_x, height)], fill=(90, 105, 125), width=2)

        # OSHA safety yellow boundary lines
        draw.line([(center_x - 30, horizon_y), (int(width * 0.15), height)], fill=(255, 204, 0), width=6)
        draw.line([(center_x + 30, horizon_y), (int(width * 0.85), height)], fill=(255, 204, 0), width=6)

        # 5000K LED high-bay overhead light bars
        for lx in [int(width * 0.25), int(width * 0.5), int(width * 0.75)]:
            draw.rectangle([lx - 80, 40, lx + 80, 55], fill=(240, 248, 255))
            # Subtle glow halo
            draw.rectangle([lx - 90, 36, lx + 90, 59], outline=(200, 225, 255), width=1)

    elif cat in ("equipment", "products", "defects"):
        # Studio gradient background with 5000K neutral daylight illumination
        for y in range(height):
            ratio = y / height
            v = int(225 - ratio * 45)
            draw.line([(0, y), (width, y)], fill=(v, v + 2, v + 6))

        # Ground contact shadow oval
        shadow_w = int(width * 0.6)
        shadow_h = int(height * 0.14)
        shadow_box = [
            (width - shadow_w) // 2,
            int(height * 0.76),
            (width + shadow_w) // 2,
            int(height * 0.76) + shadow_h
        ]
        draw.ellipse(shadow_box, fill=(160, 165, 175))

        # Main object bounding silhouette
        obj_pad = int(width * 0.2)
        obj_box = [obj_pad, int(height * 0.18), width - obj_pad, int(height * 0.78)]

        if "tote" in asset["id"]:
            fill_color = (255, 204, 0) if "hazmat" in asset["id"] else (51, 65, 85)
            draw.rectangle(obj_box, fill=fill_color, outline=(15, 23, 42), width=4)
        elif "solvent" in asset["id"] or "canister" in asset["id"] or "alpha" in asset["id"]:
            draw.rounded_rectangle(obj_box, radius=16, fill=(180, 190, 200), outline=(71, 85, 105), width=4)
        elif "crushed" in asset["id"]:
            draw.rectangle(obj_box, fill=(194, 154, 107), outline=(139, 94, 60), width=4)
            # Crumple fault lines
            draw.line([obj_box[0], obj_box[1], obj_box[2] // 2, obj_box[3] // 2], fill=(80, 50, 30), width=3)
        else:
            draw.rounded_rectangle(obj_box, radius=12, fill=(30, 41, 59), outline=(0, 74, 153), width=4)

    # Technical Overlay Metadata Banner
    banner_h = 32
    draw.rectangle([0, height - banner_h, width, height], fill=(15, 23, 42))
    draw.rectangle([0, 0, width, 4], fill=(0, 74, 153))  # GEODIS Blue Top Accent

    info_str = f"GEODIS NASHVILLE | {asset['id'].upper()} | 5000K LED | RES: {width}x{height} | {asset['lighting']}"
    draw.text((12, height - 22), info_str, fill=(148, 163, 184))

    output_file.parent.mkdir(parents=True, exist_ok=True)
    img.save(str(output_file), quality=95)
    return True


def call_imagen_api(api_key: str, prompt: str, aspect_ratio: str) -> bytes:
    """Calls Google Imagen 3 via REST API."""
    import urllib.request
    url = f"https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key={api_key}"
    payload = {
        "instances": [{"prompt": prompt}],
        "parameters": {
            "sampleCount": 1,
            "aspectRatio": aspect_ratio,
            "outputMimeType": "image/jpeg",
            "personGeneration": "DONT_ALLOW"
        }
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        b64 = res["predictions"][0]["bytesBase64Encoded"]
        return base64.b64decode(b64)


def call_openai_api(api_key: str, prompt: str, resolution: tuple) -> bytes:
    """Calls OpenAI DALL-E 3 API."""
    import urllib.request
    url = "https://api.openai.com/v1/images/generations"
    size_str = "1792x1024" if resolution[0] > resolution[1] else "1024x1024"
    payload = {
        "model": "dall-e-3",
        "prompt": prompt,
        "n": 1,
        "size": size_str,
        "response_format": "b64_json"
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        b64 = res["data"][0]["b64_json"]
        return base64.b64decode(b64)


def main():
    parser = argparse.ArgumentParser(description="GEODIS Nashville Simulation Autonomous Asset Batch Generator")
    parser.add_argument("--category", choices=["all", "environments", "equipment", "products", "defects"], default="all")
    parser.add_argument("--api", choices=["dry-run", "imagen", "openai"], default="dry-run")
    parser.add_argument("--dry-run", dest="dry_run_flag", action="store_true", help="Simulate execution without API calls")
    parser.add_argument("--api-key", default=None)
    parser.add_argument("--render-placeholders", action="store_true", help="Render high-fidelity PIL reference plates if API key is not supplied")
    parser.add_argument("--force", action="store_true", help="Overwrite existing assets")
    args = parser.parse_args()

    if args.dry_run_flag:
        args.api = "dry-run"

    api_key = args.api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("OPENAI_API_KEY")

    print("=" * 70)
    print("  GEODIS NASHVILLE LOGISTICS SIMULATION — ASSET GENERATION ENGINE")
    print(f"  Execution Mode: {args.api.upper()} | Category: {args.category.upper()}")
    print("=" * 70)

    selected = [
        item for item in ASSET_CATALOG
        if args.category == "all" or item["category"] == args.category
    ]

    print(f"Found {len(selected)} assets matching filter.")

    success_count = 0

    for idx, item in enumerate(selected, 1):
        target_path = PUBLIC_DIR / item["output_path"]
        print(f"\n[{idx}/{len(selected)}] Target: {item['id']}")
        print(f"    Path:       {target_path}")
        print(f"    Resolution: {item['resolution']} ({item['aspect_ratio']})")
        print(f"    Lighting:   {item['lighting']}")

        if target_path.exists() and not args.force:
            print(f"    [SKIP] Asset already exists ({target_path.stat().st_size} bytes). Use --force to overwrite.")
            success_count += 1
            continue

        if args.api == "dry-run":
            print("    [DRY-RUN] Prompt Preview:")
            print(f"    '{item['prompt'][:140]}...'")
            if args.render_placeholders:
                if render_procedural_plate(item, target_path):
                    print(f"    [OK] Procedural 5000K reference plate rendered: {target_path.name}")
                    success_count += 1
            else:
                success_count += 1

        elif args.api == "imagen":
            if not api_key:
                print("    [ERROR] Imagen API selected but no API key provided. Falling back to dry-run/preview.")
                continue
            try:
                print("    [API] Requesting Imagen 3 generation...")
                img_bytes = call_imagen_api(api_key, item["prompt"], item["aspect_ratio"])
                target_path.parent.mkdir(parents=True, exist_ok=True)
                with open(target_path, "wb") as f:
                    f.write(img_bytes)
                print(f"    [SUCCESS] Written {len(img_bytes)} bytes to {target_path}")
                success_count += 1
                time.sleep(2)  # Rate limit respect
            except Exception as e:
                print(f"    [FAIL] API generation failed: {e}")

        elif args.api == "openai":
            if not api_key:
                print("    [ERROR] OpenAI API selected but no API key provided.")
                continue
            try:
                print("    [API] Requesting DALL-E 3 generation...")
                img_bytes = call_openai_api(api_key, item["prompt"], item["resolution"])
                target_path.parent.mkdir(parents=True, exist_ok=True)
                with open(target_path, "wb") as f:
                    f.write(img_bytes)
                print(f"    [SUCCESS] Written {len(img_bytes)} bytes to {target_path}")
                success_count += 1
                time.sleep(2)
            except Exception as e:
                print(f"    [FAIL] API generation failed: {e}")

    print("\n" + "=" * 70)
    print(f"Execution complete. {success_count}/{len(selected)} assets verified / processed.")
    print("=" * 70)


if __name__ == "__main__":
    main()
