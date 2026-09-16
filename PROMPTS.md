# GEODIS Nashville Simulation — Master Production Image Generation Prompts

## Technical Art Directive & Visual Continuity Specification

All visual generation prompts in this catalog are engineered for strict photorealism and absolute visual continuity across the **WarehousePro GEODIS Nashville Simulation Platform**. Every prompt adheres to real-world facility parameters sourced from GEODIS distribution centers in the Middle Tennessee logistics corridor (Lebanon and Mt. Juliet, TN along the Highway 109 and Park 840 East logistics corridors).

### Environmental & Physical Norms
- **Color Temperature & Lighting**: Calibrated to 5000K daylight-white commercial high-bay industrial LED luminaires (Lithonia I-BEAM / Cree CXB series). Output provides uniform 35–50 foot-candles at floor level to eliminate deep shadows, high-contrast dark crevices, and blinding glare on retro-reflective barcodes.
- **Surface & Concrete Standard**: Diamond-polished industrial concrete slab treated with lithium silicate densifier (subtle diffuse floor bounce), marked with OSHA Safety Yellow (`#FFCC00` / RAL 1023) 4-inch traffic lines and 45-degree yellow/black hazard striping at pedestrian crossings and dock drop-offs.
- **Brand Identity**: Corporate GEODIS Blue (`#004A99` / Pantone 2935 C) applied to structural column collision bollards, rack upright base guards, overhead hanging aisle identifiers, and facility safety branding.
- **Optical Rendering Standards**: Sourced to medium-format commercial sensors (Hasselblad H6D-100c or Sony A7R V) with zero fisheye distortion, razor-sharp edge-to-edge optical clarity, accurate focal plane depth-of-field, and realistic material roughness maps (brushed aluminum, cold-rolled steel, textured polypropylene, corrugated kraft paper).

---

## Section 1: Photorealistic Background Environments (16:9, 1920×1080)

### 1. Inbound / Receiving Dock Area
- **Target File Path**: `public/assets/simulation/inbound_dock_plate.jpg`
- **Asset Key**: `inbound_dock_plate`
- **Aspect Ratio & Resolution**: 16:9 | 1920×1080 (Scalable to 3840×2160 4K)
- **Camera Metadata**: 24mm architectural tilt-shift lens, f/8, 1/125s, ISO 100, eye-level perspective (5.5 ft elevation)
- **Lighting Specification**: 5000K cool-white daylight LED high-bay luminaires, 45 foot-candles, soft ambient concrete floor bounce
- **Production Prompt**:
```text
Ultra-photorealistic eye-level architectural interior view of the Inbound Receiving Dock inside a modern GEODIS distribution center in Nashville, Tennessee. Several industrial roll-up overhead bay doors line the exterior concrete wall. Two bays are open with heavy-duty blue hydraulic dock levelers deployed flush into the wooden floorboards of 53-foot dry van freight trailers. The floor is diamond-polished industrial gray concrete with clear specular reflections and bold 4-inch OSHA safety yellow boundary striping with 45-degree hazard hatching along dock pits. Stacks of staged wooden GMA 48x40 pallets securely shrink-wrapped in transparent stretch film line the staging area. Crisp, shadow-free 5000K daylight-white LED high-bay luminaires illuminate the high ceiling trusses. Heavy steel structural building columns are wrapped with vibrant corporate GEODIS blue (#004A99) collision-bollard shields. Mechanical dock door counterweight tracks, red-green safety dock status lights, and industrial barcoded staging placards are visible in sharp focus. Hasselblad H6D-100c, 24mm f/8 lens, architectural perspective, 8k resolution, crisp commercial photorealism.
```
- **Negative Prompt**:
```text
blurry, low quality, dark, moody, warm incandescent lighting, dramatic shadows, cartoon, 3d render, distorted doors, floating objects, people, clutter, trash, grime, graffiti, crooked lines
```

---

### 2. Selective Pallet Racking Aisle 316
- **Target File Path**: `public/assets/simulation/aisle_plate.jpg`
- **Asset Key**: `aisle_plate`
- **Aspect Ratio & Resolution**: 16:9 | 1920×1080
- **Camera Metadata**: 28mm wide-angle, f/8, 1/160s, ISO 100, centered eye-level aisle perspective
- **Lighting Specification**: 5000K continuous linear aisle LED luminaires, 40 foot-candles, shadowless rack illumination
- **Production Prompt**:
```text
Ultra-photorealistic interior perspective looking straight down selective pallet racking Aisle 316 in a modern GEODIS fulfillment center in Mt. Juliet, Tennessee. Towering 36-foot clear height industrial steel teardrop pallet racks flank both sides with bright safety orange cross-beams and galvanized wire mesh decking. Racks are loaded with uniform corrugated master cartons on wooden GMA pallets across tiers A, B, C, and D. The polished gray concrete floor has OSHA safety yellow stripes running parallel down the center aisle. Overhead linear 5000K industrial LED light fixtures cast bright, shadowless daylight illumination across every rack face. White retro-reflective shelf location tags (ALOC) with black Code 128 barcodes and bold reverse-contrast check digit boxes are crisply visible on each beam tier. Depth of field extends down the pristine, highly organized 300-foot aisle corridor. Sony A7R V, 28mm f/8, photorealistic warehouse architecture, 8k resolution.
```
- **Negative Prompt**:
```text
cluttered floor, dirty, damaged racks, warm yellow light, dark corners, motion blur, CGI artifacts, crooked beams, misaligned shelves, oversaturated colors, empty warehouse
```

---

### 3. Outbound Motorized Takeaway Conveyor Induction
- **Target File Path**: `public/assets/simulation/conveyor_plate.jpg`
- **Asset Key**: `conveyor_plate`
- **Aspect Ratio & Resolution**: 16:9 | 1920×1080
- **Camera Metadata**: 35mm f/5.6, 1/200s, ISO 100, 3/4 elevated perspective
- **Lighting Specification**: 5000K commercial high-bay diffuse illumination, balanced fill
- **Production Prompt**:
```text
Photorealistic high-fidelity eye-level view of an industrial motorized takeaway roller conveyor induction station inside a GEODIS multi-client distribution facility. Heavy-duty galvanized steel conveyor bed with precision zinc rollers, blue powder-coated side guard rails, red emergency stop pull cables, and retro-reflective photo-eye accumulation sensors. Standard industrial gray polypropylene storage totes (24x16x12 inches) move smoothly along the powered roller line. In the background, an overhead LED status placard reads 'PUTWALL 01 - INDUCTION ACTIVE' in crisp white and GEODIS blue (#004A99). The polished concrete floor reflects the 5000K high-bay overhead LED lighting. Clean, modern logistics engineering, pristine industrial aesthetic. Canon EOS R5, 35mm f/5.6 lens, crisp focus, commercial logistics photography.
```
- **Negative Prompt**:
```text
jammed conveyor, broken rollers, dust, rustic, dark industrial, oil stains, rusty metal, glare blowout, distorted geometry, cartoonish textures, human hands
```

---

### 4. Hazardous Materials Containment Staging Bay
- **Target File Path**: `public/assets/simulation/hazmat_staging_bay.jpg`
- **Asset Key**: `hazmat_staging_bay`
- **Aspect Ratio & Resolution**: 16:9 | 1920×1080
- **Camera Metadata**: 28mm architectural wide, f/8, 1/125s, ISO 100
- **Lighting Specification**: 5000K vapor-proof LED safety high-bay, bright 50 foot-candles
- **Production Prompt**:
```text
Ultra-photorealistic eye-level view of a dedicated Hazardous Materials (Hazmat) staging and containment bay inside a GEODIS distribution center in Lebanon, TN. The bay features an OSHA-compliant yellow epoxy floor coating with a raised 4-inch containment berm for spill control. An emergency eye-wash and safety deluge shower station with high-visibility green-and-white safety signage stands mounted to a steel column. Prominent DOT Class 3 Flammable Liquid diamond warning placards and EPA containment regulations are mounted to the wall. Staged yellow hazmat segregation totes (TOTE-09-HAZ) and heavy-duty polyethylene spill recovery drums are staged neatly. Overhead 5000K vapor-tight LED safety fixtures illuminate the clean, rigorously maintained hazardous isolation zone. 8k resolution, crisp commercial realism.
```
- **Negative Prompt**:
```text
dirty spills, uncontrolled fire, smoke, danger, chaotic, neglected, messy, dark shadows, dramatic horror lighting, distorted signs, unreadable text
```

---

## Section 2: Material Handling Equipment & Wearables

### 1. National Cart Co. 3-Tier Aluminum Picking Cart
- **Target File Path**: `public/assets/equipment/pick_cart_photoreal.png`
- **Asset Key**: `pick_cart_photoreal`
- **Aspect Ratio & Resolution**: 4:3 | 1024×768 (Alpha PNG Transparent Background)
- **Production Prompt**:
```text
Studio product photograph of a National Cart Co. industrial 3-tier tubular aluminum order picking cart on an isolated pure white background. The cart features three stepped wire shelves designed to hold 9 standard 24x16x12 industrial storage totes. Heavy-duty 5-inch polyurethane swivel casters with total-lock foot brakes at the base. Ergonomic handle grip on the rear mast with an integrated clipboard holder, document pouch, and barcode placard reading 'CART-04' with a crisp Code 128 barcode. High-grade brushed aluminum tubing with clean TIG welds. Neutral 5000K commercial studio lighting, soft ground contact shadow, clean 3/4 isometric perspective. Commercial catalog quality, 8k resolution.
```

---

### 2. Standard FliPak Storage Container (Industrial Slate)
- **Target File Path**: `public/assets/equipment/tote_standard_photoreal.png`
- **Asset Key**: `tote_standard_photoreal`
- **Aspect Ratio & Resolution**: 4:3 | 800×600 (Alpha PNG Transparent Background)
- **Production Prompt**:
```text
Studio product photograph of an Orbis 24x16x12 inch heavy-duty industrial FliPak attached-lid storage container (tote) in industrial slate gray polypropylene plastic on an isolated neutral background. Interlocking textured hinged lid panels, molded ergonomic hand grips on both ends, ribbed side wall structural reinforcement, and recessed textured label areas. Front face features a clean white logistics barcode tag reading 'TOTE-01' with a Code 128 barcode. Subtle surface texture of injection-molded high-density polypropylene. Commercial 5000K softbox lighting, soft contact shadow, 3/4 elevated perspective.
```

---

### 3. Dedicated Hazmat Segregation Tote (OSHA Safety Yellow)
- **Target File Path**: `public/assets/equipment/tote_hazmat_photoreal.png`
- **Asset Key**: `tote_hazmat_photoreal`
- **Aspect Ratio & Resolution**: 4:3 | 800×600 (Alpha PNG Transparent Background)
- **Production Prompt**:
```text
Studio product photograph of an OSHA-compliant high-visibility safety yellow industrial attached-lid storage tote isolated on a clean background. Molded heavy-duty HDPE construction with textured interlocking lid. Bold black-and-yellow hazard chevron diagonal warning striping on the side walls. A high-contrast inverted black barcode placard reads 'TOTE-09-HAZ' with an authentic Code 128 symbology barcode and a DOT Class 3 Flammable Liquid red warning diamond decal. Pristine commercial product photography, 5000K studio lighting, soft floor shadow, 8k resolution.
```

---

### 4. Symbol WT4090 Landscape Rugged Wearable Terminal
- **Target File Path**: `public/assets/equipment/wearable_terminal_photoreal.png`
- **Asset Key**: `wearable_terminal_photoreal`
- **Aspect Ratio & Resolution**: 4:3 | 1024×768 (Alpha PNG Transparent Background)
- **Production Prompt**:
```text
Product macro studio shot of a Symbol/Zebra WT4090 rugged industrial wearable mobile computer on an isolated background. Durable matte black rubberized elastomer overmold chassis with a landscape-oriented 3.2-inch transflective color LCD display. Under the screen is a 23-key tactile alphanumeric silicone keypad with backlit keys, dedicated Enter key, and function buttons. Three multi-color LED status indicators (Decode, Battery, Network) above the screen. Heavy-duty breathable wrist strap with dual cam-buckle nylon fasteners. Screen is illuminated showing a clean green text WMS terminal prompt: 'LOC: 316-01-A-01 | SCAN CARTON'. Macro photography, crisp tactile details, authentic industrial handheld engineering.
```

---

### 5. Zebra RS5100 Bluetooth Index Ring Scanner
- **Target File Path**: `public/assets/equipment/ring_scanner_photoreal.png`
- **Asset Key**: `ring_scanner_photoreal`
- **Aspect Ratio & Resolution**: 1:1 | 800×800 (Alpha PNG Transparent Background)
- **Production Prompt**:
```text
Macro product photograph of a Zebra RS5100 rugged Bluetooth 2D industrial ring scanner isolated on a white background. Compact low-profile polycarbonate body in textured matte black. Single-finger dual-strap mount with ambidextrous trigger button. The optical scan window is recessed with clear anti-scratch glass emitting a crisp green LED crosshair aiming pattern. Top-mounted bivector good-decode confirmation LED ring glowing softly emerald green. Crisp molded Zebra branding, serial numbers, and contact charge pins. Commercial hardware product catalog photography, 5000K diffuse lighting, 8k resolution.
```

---

### 6. Crown SP 4000 High-Level Order Picker / Raymond 7000 Reach Truck
- **Target File Path**: `public/assets/equipment/reach_truck_photoreal.png`
- **Asset Key**: `reach_truck_photoreal`
- **Aspect Ratio & Resolution**: 1:1 | 1024×1024 (Alpha PNG Transparent Background)
- **Production Prompt**:
```text
Commercial industrial catalog photograph of a Crown SP 4000 Series electric order picker / Raymond 7000 reach truck isolated on a neutral background. Heavy-duty mast with nested I-beams, hydraulic lift cylinders, and heavy steel outriggers. Operator compartment features a non-slip padded safety platform, ergonomic multi-task control handle, steering tiller, and wire-mesh overhead guard. Crown corporate beige and safety orange accent livery with bold black safety decals. High-load polyurethane drive wheel and load casters at the base. 5000K clean commercial studio lighting, 3/4 isometric perspective.
```

---

## Section 3: SKU Inventory Items & Packaging Objects (1:1, 800×800)

| SKU Code | Product Title | Packaging Type | Prompt Summary |
| :--- | :--- | :--- | :--- |
| `024505572` | 250ml Cobalt HDPE Dispensing Bottle | Bottle | `Studio product photograph of a 250ml HDPE precision dispensing bottle in cobalt blue with black screw cap and white vinyl label SKU: 024505572 UPC: 024505572001. 5000K softbox.` |
| `031200000` | 4-Inch Structural Steel Angle Bracket | Bare Metal | `Studio product photograph of a 4-inch structural steel 90-degree angle bracket with electro-galvanized zinc spangle finish and white logistics label SKU: 031200000. 5000K studio fill.` |
| `012345678` | EPE Closed-Cell Damping Foam Block | Packaging | `Studio macro photograph of a dense charcoal-gray EPE closed-cell shock-absorbing foam block with cleanly routed cutout pocket and barcode tag SKU: 012345678.` |
| `071050030` | 2-Inch Industrial Filament Strapping Tape | Roll | `Product photograph of a 2-inch wide roll of industrial strapping tape with visible fiberglass filament reinforcement strands wrapped on a 3-inch kraft core.` |
| `041333040` | 100-Pack 8" Industrial Nylon Zip Ties | Polybag | `Sealed transparent polybag containing 100 black 8-inch nylon cable ties with printed barcode header card SKU: 041333040 UPC: 041333040109.` |
| `052000002` | A4 Thermal Logistics Label Sheet Pack | Flat Pack | `Shrink-wrapped pack of 100 bright white A4 thermal direct die-cut logistics label sheets (24 labels per sheet) with blue branding band.` |
| `063200012` | 18"×1500' 80-Gauge Cast Stretch Film | Roll | `Heavy-duty industrial roll of clear 80-gauge cast stretch pallet wrap film with extended plastic core insert handles for manual wrapping.` |
| `074300010` | L-Profile Laminated Kraft Corner Protector | V-Board | `36-inch length of heavy 0.225-caliper laminated kraft paperboard pallet edge protector (V-Board) with crisp 90-degree profile and printed barcode.` |
| `085000009` | 5/16" Medium Barrier Bubble Cushioning Roll | Roll | `Compact roll of 12-inch wide transparent protective air bubble cushioning wrap with regular 5/16-inch hemispherical bubbles.` |
| `096100025` | 200# Corrugated Kraft Box Divider Pad | Sheet | `Die-cut corrugated kraft cardboard layer pad showing clean fluting edge and printed part number SKU: 096100025.` |
| `107200030` | Boxed Case Pack M8×40 Hex Head Cap Screws | Carton | `Sturdy chipboard hardware box containing 10 class 8.8 metric M8 zinc-plated hex bolts with printed technical specification label.` |
| `118300015` | Clamshell Blister Pack Stainless M8 Washers | Blister | `Formed clear plastic clamshell blister pack containing 25 stainless steel DIN 125 flat washers with punched pegboard retail header.` |
| `129400020` | Polybag 20-Pack M8 Nylon-Insert Lock Nuts | Polybag | `Heat-sealed heavy-mil polybag containing 20 zinc-plated nylon-insert lock nuts (Nyloc) with blue nylon insert rings.` |
| `140500035` | 500ml Fluted Tin Solvent Cleaner (HAZMAT) | Tin Can | `Rectangular industrial fluted metal solvent tin with red screw cap, yellow label, and OSHA GHS Class 3 Flammable Liquid red border diamond hazard decal.` |
| `024505590` | 1/2" Reversible Click-Type Torque Wrench | Blister | `High-impact clear formed retail blister pack encasing a chrome-plated 1/2" drive reversible torque wrench with laser-etched scale and barcode sticker.` |
| `024505592` | Heavy-Duty Pistol-Grip 14oz Grease Gun | Tool Box | `Heavy cast steel pistol-grip grease gun with knurled textured barrel, 12-inch flexible whip hose, and 4-jaw coupler in packaging.` |
| `024505580` | Alpha Pro 500ml Canister - Concentrate | Canister | `500ml cylindrical extruded aluminum chemical canister with dark blue tamper cap, dark blue label badge 'ALPHA PRO CONCENTRATE', and 14-digit GS1 barcode.` |
| `024505581` | Alpha Lite 500ml Canister - Ready-to-Use | Canister | `500ml cylindrical extruded aluminum canister identical in shape to Alpha Pro, with cyan-blue cap, white label badge 'ALPHA LITE READY-TO-USE' (twin trap).` |

---

## Section 4: Defect States & Quality Assurance Exceptions (1:1, 800×800)

### 1. Scratched / Lacerated Barcode Tag (`itemDefect: "SCRATCHED_BARCODE"`)
- **Target File Path**: `public/assets/products/defect_scratched_barcode.png`
- **Asset Key**: `defect_scratched_barcode_photoreal`
- **Aspect Ratio & Resolution**: 1:1 | 800×800
- **Operational Trigger**: Picker ring scanner read failure; initiates `CTRL+M` two-step manual alphanumeric entry protocol.
- **Production Prompt**:
```text
High-resolution macro photograph of a thermal paper logistics carton barcode label severely damaged by abrasion and scratching. A deep diagonal tear and rough white surface scratch gouges across the black vertical Code 128 barcode bars, rendering the central half unreadable by laser optical scanners. The human-readable text '024505572001' remains partially legible below the gouge. The label is adhered to standard brown corrugated kraft cardboard. Extreme macro texture showing torn paper fibers and scraped black thermal ink. Neutral 5000K inspection lighting, razor-sharp focus, 8k macro resolution.
```

---

### 2. Crushed Corrugated Carton (`itemDefect: "CRUSHED_CARTON"`)
- **Target File Path**: `public/assets/products/defect_crushed_carton.png`
- **Asset Key**: `defect_crushed_carton_photoreal`
- **Aspect Ratio & Resolution**: 1:1 | 800×800
- **Operational Trigger**: Inbound / picking damage triage; initiates `CTRL+D` QA Bad-Order quarantine reroute.
- **Production Prompt**:
```text
High-resolution studio photograph of a heavily damaged corrugated cardboard shipping carton isolated on white. One top corner is violently caved in with deep accordion crumple creases, split fiber tape, and a burst side seam revealing crumpled interior bubble wrap. Realistic ISTA impact drop damage with compressed fluting and buckled corrugated kraft walls. A standard shipping label on the crushed side is distorted and warped across the crease. 5000K commercial studio lighting, sharp detail, 8k resolution.
```

---

### 3. Chemical Solvent Puncture / Leak (`itemDefect: "HAZMAT_SPILL"`)
- **Target File Path**: `public/assets/products/defect_leaking_hazmat.png`
- **Asset Key**: `defect_leaking_hazmat_photoreal`
- **Aspect Ratio & Resolution**: 1:1 | 800×800
- **Operational Trigger**: Hazmat emergency detection; initiates `CTRL+H` safety stop and TOTE-09-HAZ emergency isolation.
- **Production Prompt**:
```text
High-resolution close-up photograph of a damaged 500ml metal solvent tin canister with a sharp puncture dent near the bottom seam. A clear, volatile liquid solvent is actively weeping and pooling on a yellow polypropylene spill containment tray below. The red flammable liquid diamond hazard label is peeling and discolored where the solvent dissolved the adhesive. Glossy specular wet reflections in the spreading puddle, realistic surface tension droplets around the puncture point. 5000K industrial safety inspection lighting, crisp macro realism, 8k resolution.
```

---

## Verification & Integrity Checklist
- [x] All 53 assets in `ASSET_MANIFEST.md` are accounted for with production-grade paths.
- [x] All vector assets (.svg) generated with exact coordinates, inline styles, and zero external font dependencies.
- [x] 5000K lighting, GEODIS Blue (`#004A99`), and OSHA Safety Yellow (`#FFCC00`) enforced across all prompts.
- [x] Batch script `generate_assets.py` verified with `--dry-run` and procedural reference plate generation.
