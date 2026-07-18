"""
Fix remaining mismatched / lookalike demo product photos.

Targets products that still show unrelated Commons photos (computer labs,
squirrels, wrong-drug packs, Malta-the-island sculpture) or share near-identical
packaging series that look like duplicates.

Emits V21__fix_remaining_mismatched_images.sql and updates image_manifest.json.
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_real_images import (  # noqa: E402
    MANIFEST_PATH,
    PRODUCTS_JSON,
    ROOT,
    commons_image_url,
    process_image,
    SESSION,
)

V21_PATH = os.path.join(
    ROOT, "backend", "src", "main", "resources", "db", "migration",
    "V21__fix_remaining_mismatched_images.sql",
)

# Hand-picked Commons titles — one distinct, product-matching photo each.
DIRECT_COMMONS_TITLES = {
    # Foods: wrong / unrelated photos
    "AquaGold Premium Water": "File:Nestlé Pure Life water.jpg",
    "NatureSnack Almond Brittle": "File:Almond Roca.jpg",
    "TropiGold Pineapple Malt": "File:Malta Guinness cans.jpg",
    # Staples that shared the same Israel packaging series (look like duplicates)
    "TropiFufu Plantain Mix": "File:Fufu.jpg",
    "GoldCraft Eba Garri": "File:Garri.jpg",
    "NatureMix Akple Dough": "File:Banku and Okro stew.jpg",
    "SunCraft Akyeke": "File:Attieke.jpg",
    "NatureGold Teff Flour": "File:Teff grain.jpg",
    "GoldenHusk Husked Millet": "File:Pearl millet.jpg",
    "SunStaple Abolo Mix": "File:Kenkey.jpg",
    # Drugs: wrong hormone / eczema / unrelated packs
    "QuiniCure 300mg Tablets": "File:Quinine sulfate.jpg",
    "EryGold 250mg Tablets": "File:Erythromycin.jpg",
    "AugmentPlus 625mg Tablets": "File:Amoxicillin clavulanate.jpg",
    "ChloroCure 250mg Capsules": "File:Chloroquine phosphate tablets.jpg",
    "GentaCure 80mg Injection": "File:Gentamicin sulfate.jpg",
    "OfloxiCure 400mg Tablets": "File:Ofloxacin.jpg",
    "LinezoCure 600mg Tablets": "File:Linezolid.jpg",
    "RifampGold 300mg Capsules": "File:Rifampicin capsules.jpg",
    "TrimSulfa 960mg Tablets": "File:Co-trimoxazole.jpg",
    "LevoCure 500mg Tablets": "File:Levofloxacin tablets.jpg",
    "EthamGold 400mg Tablets": "File:Ethambutol tablets.jpg",
    "FluEnd Cold Capsules": "File:Cold medicine capsules.jpg",
}

# Fallback candidates if primary title is missing / already used / hash-collides.
ALTERNATES = {
    "AquaGold Premium Water": [
        "File:Nestlé Pure Life water.jpg",
        "File:Fiji Water bottle.jpg",
        "File:Smartwater bottle.jpg",
        "File:Crystal Geyser Alpine Spring Water.jpg",
        "File:Poland Spring water bottle.jpg",
    ],
    "NatureSnack Almond Brittle": [
        "File:Almond Roca.jpg",
        "File:Almond toffee.jpg",
        "File:English toffee with almonds.jpg",
        "File:Brittle (food).jpg",
    ],
    "TropiGold Pineapple Malt": [
        "File:Malta Guinness cans.jpg",
        "File:Supermalt.jpg",
        "File:Amstel Malta.jpg",
        "File:Malta drink.jpg",
    ],
    "TropiFufu Plantain Mix": [
        "File:Fufu.jpg",
        "File:Pound plantain.jpg",
        "File:Fufu and soup.jpg",
    ],
    "GoldCraft Eba Garri": [
        "File:Garri.jpg",
        "File:Gari.jpg",
        "File:Cassava garri.jpg",
    ],
    "NatureMix Akple Dough": [
        "File:Banku and Okro stew.jpg",
        "File:Banku.jpg",
        "File:Akple.jpg",
    ],
    "SunCraft Akyeke": [
        "File:Attieke.jpg",
        "File:Attiéké.jpg",
        "File:Cassava couscous.jpg",
    ],
    "NatureGold Teff Flour": [
        "File:Teff grain.jpg",
        "File:Eragrostis tef.jpg",
        "File:Teff flour.jpg",
    ],
    "GoldenHusk Husked Millet": [
        "File:Pearl millet.jpg",
        "File:Millet grain.jpg",
        "File:Finger millet.jpg",
    ],
    "SunStaple Abolo Mix": [
        "File:Kenkey.jpg",
        "File:Fante kenkey.jpg",
        "File:Corn dough.jpg",
    ],
    "QuiniCure 300mg Tablets": [
        "File:Quinine sulfate.jpg",
        "File:Quinine tablets.jpg",
        "File:Blister pack.jpg",
        "File:Blister of tablets.jpg",
    ],
    "EryGold 250mg Tablets": [
        "File:Erythromycin.jpg",
        "File:Erythromycin tablets.jpg",
        "File:Blister of tablets.jpg",
    ],
    "AugmentPlus 625mg Tablets": [
        "File:Amoxicillin clavulanate.jpg",
        "File:Amoxicillin-clavulanate potassium.jpg",
        "File:Generic amoxicillin-clavulanic acid tablets with 875mg amoxicillin.jpg",
        "File:Blister of tablets.jpg",
    ],
    "ChloroCure 250mg Capsules": [
        "File:Chloroquine phosphate tablets.jpg",
        "File:Chloroquine.jpg",
        "File:Hydroxychloroquine sulfate.jpg",
        "File:Blister of tablets.jpg",
    ],
    "GentaCure 80mg Injection": [
        "File:Gentamicin sulfate.jpg",
        "File:Gentamicin.jpg",
        "File:Drug ampoule JPN.jpg",
        "File:Ampoule.jpg",
    ],
    "OfloxiCure 400mg Tablets": [
        "File:Ofloxacin.jpg",
        "File:Ofloxacin tablets.jpg",
        "File:Blister of tablets.jpg",
    ],
    "LinezoCure 600mg Tablets": [
        "File:Linezolid.jpg",
        "File:Zyvox.jpg",
        "File:Blister of tablets.jpg",
    ],
    "RifampGold 300mg Capsules": [
        "File:Rifampicin capsules.jpg",
        "File:Rifampin.jpg",
        "File:Rifampicin.jpg",
        "File:Blister of tablets.jpg",
    ],
    "TrimSulfa 960mg Tablets": [
        "File:Co-trimoxazole.jpg",
        "File:Trimethoprim-sulfamethoxazole.jpg",
        "File:Bactrim.jpg",
        "File:Blister of tablets.jpg",
    ],
    "LevoCure 500mg Tablets": [
        "File:Levofloxacin tablets.jpg",
        "File:Levofloxacin.jpg",
        "File:Levaquin.jpg",
        "File:Blister of tablets.jpg",
    ],
    "EthamGold 400mg Tablets": [
        "File:Ethambutol tablets.jpg",
        "File:Ethambutol.jpg",
        "File:Myambutol.jpg",
        "File:Blister of tablets.jpg",
    ],
    "FluEnd Cold Capsules": [
        "File:Cold medicine capsules.jpg",
        "File:Cold and flu capsules.jpg",
        "File:Paracetamol capsules.jpg",
        "File:Blister pack.jpg",
    ],
}


def sql_escape(s: str) -> str:
    return s.replace("'", "''")


def save_manifest(manifest: dict) -> None:
    """Write manifest via a sibling file then copy (OneDrive-safe)."""
    import shutil

    alt = os.path.join(os.path.dirname(MANIFEST_PATH), "image_manifest.fixed.json")
    with open(alt, "w", encoding="utf-8", newline="\n") as out:
        json.dump(manifest, out)
        out.flush()
        os.fsync(out.fileno())
    for attempt in range(10):
        try:
            shutil.copyfile(alt, MANIFEST_PATH)
            return
        except (PermissionError, OSError) as e:
            print(f"    manifest write retry {attempt + 1}: {e}")
            time.sleep(1.0 * (attempt + 1))
    print(f"WARNING: could not overwrite {MANIFEST_PATH}; left updates in {alt}")


def download_title(title: str):
    url = commons_image_url(title)
    time.sleep(0.35)
    if not url:
        return None
    resp = SESSION.get(url, timeout=30)
    resp.raise_for_status()
    jpeg = process_image(resp.content)
    digest = hashlib.sha256(jpeg).hexdigest()
    return title, url, jpeg, digest


def resolve_commons_title(query_title: str) -> str | None:
    """Resolve a File: title via Commons search if exact title 404s."""
    # Try exact first via imageinfo
    url = commons_image_url(query_title)
    if url:
        return query_title
    # Fallback: search
    term = query_title.replace("File:", "").rsplit(".", 1)[0]
    params = {
        "action": "query",
        "list": "search",
        "srsearch": f"filetype:bitmap {term}",
        "srnamespace": 6,
        "srlimit": 8,
        "format": "json",
    }
    time.sleep(0.3)
    r = SESSION.get("https://commons.wikimedia.org/w/api.php", params=params, timeout=30)
    r.raise_for_status()
    hits = r.json().get("query", {}).get("search", [])
    for hit in hits:
        title = hit["title"]
        if commons_image_url(title):
            return title
    return None


def main() -> None:
    products = json.load(open(PRODUCTS_JSON, encoding="utf-8"))
    food_meta = {n: c for n, c in products["food"]}
    drug_meta = {n: (g, c) for n, g, c, _code in products["drug"]}

    manifest = json.load(open(MANIFEST_PATH, encoding="utf-8"))

    refresh_names = [n for n in DIRECT_COMMONS_TITLES if n in manifest]
    missing = [n for n in DIRECT_COMMONS_TITLES if n not in manifest]
    if missing:
        print("WARNING: not in manifest:", missing)

    used_hashes = {e["sha256"] for n, e in manifest.items() if n not in refresh_names}
    used_titles = {e["commons_title"] for n, e in manifest.items() if n not in refresh_names}

    fixed = []
    failed = []
    for i, name in enumerate(refresh_names, 1):
        primary = DIRECT_COMMONS_TITLES[name]
        candidates = [primary] + [t for t in ALTERNATES.get(name, []) if t != primary]
        print(f"[{i}/{len(refresh_names)}] {name}")
        result = None
        for title in candidates:
            if title in used_titles:
                print(f"    skip used title {title}")
                continue
            resolved = resolve_commons_title(title)
            if not resolved:
                print(f"    not found {title}")
                continue
            if resolved != title:
                print(f"    resolved {title} -> {resolved}")
            if resolved in used_titles:
                print(f"    skip used resolved {resolved}")
                continue
            try:
                result = download_title(resolved)
            except Exception as e:
                print(f"    download fail {resolved}: {e}")
                result = None
            if not result:
                continue
            title, url, jpeg, digest = result
            if digest in used_hashes:
                print(f"    skip duplicate hash for {title}")
                result = None
                continue
            break
        if not result:
            print(f"    !!! FAILED {name}")
            failed.append(name)
            continue

        title, url, jpeg, digest = result
        used_hashes.add(digest)
        used_titles.add(title)
        b64 = base64.b64encode(jpeg).decode("ascii")
        if name in food_meta:
            entry = {
                "category": food_meta[name],
                "type": "food",
                "commons_title": title,
                "source_url": url,
                "sha256": digest,
                "bytes": len(jpeg),
                "data_uri": f"data:image/jpeg;base64,{b64}",
            }
        else:
            generic, category = drug_meta[name]
            entry = {
                "category": category,
                "type": "drug",
                "generic": generic,
                "commons_title": title,
                "source_url": url,
                "sha256": digest,
                "bytes": len(jpeg),
                "data_uri": f"data:image/jpeg;base64,{b64}",
            }
        manifest[name] = entry
        fixed.append(name)
        print(f"    -> {title}")

    save_manifest(manifest)
    print(f"Manifest saved ({len(fixed)} updates)")

    lines = [
        "-- Fix remaining mismatched / lookalike demo product images.",
        "-- Replaces unrelated Commons photos and near-duplicate packaging series",
        "-- with unique, product-matching photos. Idempotent by product/drug name.",
        "",
    ]
    for name in fixed:
        entry = manifest[name]
        uri = sql_escape(entry["data_uri"])
        pname = sql_escape(name)
        if entry["type"] == "food":
            lines.append(
                f"UPDATE product_batches SET image_url = '{uri}' WHERE product_name = '{pname}';"
            )
        else:
            lines.append(
                f"UPDATE drug_batches db SET image_url = '{uri}' "
                f"FROM drugs d WHERE d.id = db.drug_id AND d.name = '{pname}';"
            )

    with open(V21_PATH, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines) + "\n")

    hashes = {}
    dupes = []
    for n, e in manifest.items():
        h = e["sha256"]
        if h in hashes:
            dupes.append((n, hashes[h]))
        else:
            hashes[h] = n

    print(f"\nFixed {len(fixed)}; failed {len(failed)}; dupes {len(dupes)}")
    if failed:
        print("FAILED:", failed)
    if dupes:
        print("DUPES:", dupes)
    print(f"Wrote {V21_PATH}")


if __name__ == "__main__":
    main()
