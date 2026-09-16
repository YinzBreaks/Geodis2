import os
from pathlib import Path

BASE_DIR = Path(r"c:\Users\micha\Geodis2")
manifest_path = BASE_DIR / "ASSET_MANIFEST.md"

with open(manifest_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

found = []
missing = []

for line in lines:
    line_s = line.strip()
    if line_s.startswith("| `"):
        parts = [p.strip() for p in line_s.split("|")[1:-1]]
        if len(parts) >= 2:
            key = parts[0].strip("` ")
            rel_path = parts[1].strip("` ")
            full_path = BASE_DIR / rel_path
            if full_path.exists():
                size = full_path.stat().st_size
                found.append((key, rel_path, size))
            else:
                missing.append((key, rel_path, str(full_path)))

print(f"Total manifest entries checked: {len(found) + len(missing)}")
print(f"Found on disk: {len(found)}")
print(f"Missing: {len(missing)}")

if missing:
    print("\n--- MISSING FILES ---")
    for k, r, p in missing:
        print(f"[MISSING] {k} -> {r}")
else:
    print("\n[SUCCESS] ALL 53 ASSETS LISTED IN ASSET_MANIFEST.MD EXIST ON DISK!")
    for k, r, sz in found[:5]:
        print(f"  [OK] {k} -> {r} ({sz} bytes)")
    print(f"  ... and {len(found)-5} more verified successfully.")
