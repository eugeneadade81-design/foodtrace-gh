"""
Replace near-duplicate Commons packaging series with unique, product-matching
photos so no two products look like they share the same image.

Targets remaining lookalike groups after V20/V21:
- AM 629232 pharmaceutical boxes (12 products)
- AM 2007.41.2 food cans (4)
- Ng Fung jasmine rice bags (3)
- Fish seasoning series (3)
- Lipton teabox pair, Fucicort pair, medicine-chest pair, Gilbert chemistry pair

Emits V22__fix_lookalike_duplicate_images.sql and updates image_manifest.json.
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

V22_PATH = os.path.join(
    ROOT, "backend", "src", "main", "resources", "db", "migration",
    "V22__fix_lookalike_duplicate_images.sql",
)

# Hand-picked Commons titles — one distinct, product-matching photo each.
DIRECT_COMMONS_TITLES = {
    # Pharma boxes series (AM 629232) — replace all 12
    "DermaSoft Emollient Cream": "File:Aqueous cream.jpg",
    "CounterfeitCoartem 80mg": "File:Coartem.jpg",
    "ExpiredAmpiclox 500mg": "File:Ampicillin capsules.jpg",
    "FakeAugmentin 625mg": "File:Amoxicillin clavulanate.jpg",
    "ColdStop Combo Tablets": "File:Cold medicine capsules.jpg",
    "GastroCalm Suspension": "File:Antacid liquid.jpg",
    "TummyCare Probiotic": "File:Probiotic capsules.jpg",
    "ColicEnd Infant Drops": "File:Infant medicine drops.jpg",
    "FungiStop Ketoconazole 2%": "File:Ketoconazole cream.jpg",
    "SkinGold Calamine Lotion": "File:Calamine lotion.jpg",
    "AcneCure Benzoyl Peroxide 5%": "File:Benzoyl peroxide.jpg",
    "WoundCure Gentian Violet": "File:Gentian violet.jpg",
    # Food cans series (AM 2007.41.2)
    "TropiMilk Instant Whole Milk": "File:Powdered milk.jpg",
    "NatureBaby Oat Porridge": "File:Baby cereal.jpg",
    "GoldenSip Tigernut Drink": "File:Horchata.jpg",
    "ClearFry Corn Oil": "File:Corn oil.jpg",
    # Rice bags (same Ng Fung series)
    "GrainGold Long Grain Rice": "File:Long grain rice.jpg",
    "GoldenPearl Polished Rice": "File:White rice bag.jpg",
    "SunGold Brown Rice": "File:Brown rice.jpg",
    # Fish seasoning lookalikes
    "SunSeason All Purpose Seasoning": "File:Seasoning mix.jpg",
    "FreshSeason Jollof Seasoning": "File:Curry powder.jpg",
    "FreshSpice Onga Seasoning": "File:Bouillon cubes.jpg",
    # Tea pair
    "LifeFresh Lemon Tea": "File:Lemon tea.jpg",
    "FreshBrew Moringa Tea": "File:Moringa tea.jpg",
    # Fucicort lookalike pair
    "FusiCure 250mg Tablets": "File:Fusidic acid.jpg",
    "SkinGold Betamethasone Cream": "File:Betamethasone cream.jpg",
    # Medicine chest lookalike pair
    "ArteGold IV 60mg Injection": "File:Injection vial.jpg",
    "QuinaGold 200mg Tablets": "File:Quinine tablets.jpg",
    # Gilbert chemistry lookalike pair
    "VitaGold Iron 65mg Tablets": "File:Ferrous sulfate tablets.jpg",
    "VitaGold Zinc 20mg Tablets": "File:Zinc tablets.jpg",
}

ALTERNATES = {
    "DermaSoft Emollient Cream": [
        "File:Aqueous cream.jpg",
        "File:Moisturizing cream.jpg",
        "File:Emollient cream.jpg",
        "File:Skin cream tube.jpg",
    ],
    "CounterfeitCoartem 80mg": [
        "File:Coartem.jpg",
        "File:Artemether lumefantrine.jpg",
        "File:Malaria medicine.jpg",
        "File:Blister of tablets.jpg",
    ],
    "ExpiredAmpiclox 500mg": [
        "File:Ampicillin capsules.jpg",
        "File:Ampicillin.jpg",
        "File:Ampicillin capsules USP.jpg",
        "File:Blister pack.jpg",
    ],
    "FakeAugmentin 625mg": [
        "File:Amoxicillin clavulanate.jpg",
        "File:Augmentin.jpg",
        "File:Amoxicillin-clavulanate potassium.jpg",
        "File:Blister of tablets.jpg",
    ],
    "ColdStop Combo Tablets": [
        "File:Cold medicine capsules.jpg",
        "File:Cold and flu tablets.jpg",
        "File:Cold and flu capsules.jpg",
        "File:Paracetamol capsules.jpg",
    ],
    "GastroCalm Suspension": [
        "File:Antacid liquid.jpg",
        "File:Antacid suspension.jpg",
        "File:Maalox.jpg",
        "File:Gaviscon.jpg",
    ],
    "TummyCare Probiotic": [
        "File:Probiotic capsules.jpg",
        "File:Probiotic supplements.jpg",
        "File:Yakult probiotic.jpg",
        "File:Dietary supplement capsules.jpg",
    ],
    "ColicEnd Infant Drops": [
        "File:Infant medicine drops.jpg",
        "File:Baby medicine drops.jpg",
        "File:Simethicone drops.jpg",
        "File:Oral drops bottle.jpg",
    ],
    "FungiStop Ketoconazole 2%": [
        "File:Ketoconazole cream.jpg",
        "File:Ketoconazole.jpg",
        "File:Antifungal cream.jpg",
        "File:Nizoral cream.jpg",
    ],
    "SkinGold Calamine Lotion": [
        "File:Calamine lotion.jpg",
        "File:Calamine.jpg",
        "File:Calamine lotion bottle.jpg",
        "File:Pink lotion bottle.jpg",
    ],
    "AcneCure Benzoyl Peroxide 5%": [
        "File:Benzoyl peroxide.jpg",
        "File:Benzoyl peroxide gel.jpg",
        "File:Acne cream.jpg",
        "File:Acne medication.jpg",
    ],
    "WoundCure Gentian Violet": [
        "File:Gentian violet.jpg",
        "File:Gentian violet solution.jpg",
        "File:Crystal violet.jpg",
        "File:Antiseptic solution bottle.jpg",
    ],
    "TropiMilk Instant Whole Milk": [
        "File:Powdered milk.jpg",
        "File:Milk powder can.jpg",
        "File:Nido milk powder.jpg",
        "File:Instant milk powder.jpg",
    ],
    "NatureBaby Oat Porridge": [
        "File:Baby cereal.jpg",
        "File:Infant cereal.jpg",
        "File:Oatmeal porridge.jpg",
        "File:Baby food jar.jpg",
    ],
    "GoldenSip Tigernut Drink": [
        "File:Horchata.jpg",
        "File:Horchata drink.jpg",
        "File:Tiger nut milk.jpg",
        "File:Chufa drink.jpg",
    ],
    "ClearFry Corn Oil": [
        "File:Corn oil.jpg",
        "File:Mazola corn oil.jpg",
        "File:Cooking oil bottle.jpg",
        "File:Vegetable oil bottle.jpg",
    ],
    "GrainGold Long Grain Rice": [
        "File:Long grain rice.jpg",
        "File:Basmati rice bag.jpg",
        "File:Jasmine rice bag.jpg",
        "File:Rice sack.jpg",
    ],
    "GoldenPearl Polished Rice": [
        "File:White rice bag.jpg",
        "File:White rice.jpg",
        "File:Polished rice.jpg",
        "File:Rice package.jpg",
    ],
    "SunGold Brown Rice": [
        "File:Brown rice.jpg",
        "File:Brown rice bag.jpg",
        "File:Whole grain brown rice.jpg",
        "File:Unpolished rice.jpg",
    ],
    "SunSeason All Purpose Seasoning": [
        "File:Seasoning mix.jpg",
        "File:All purpose seasoning.jpg",
        "File:Spice mix jar.jpg",
        "File:Mixed spices.jpg",
    ],
    "FreshSeason Jollof Seasoning": [
        "File:Curry powder.jpg",
        "File:Jollof rice seasoning.jpg",
        "File:Suya spice.jpg",
        "File:African spice mix.jpg",
    ],
    "FreshSpice Onga Seasoning": [
        "File:Bouillon cubes.jpg",
        "File:Maggi cubes.jpg",
        "File:Stock cubes.jpg",
        "File:Seasoning cubes.jpg",
    ],
    "LifeFresh Lemon Tea": [
        "File:Lemon tea.jpg",
        "File:Lemon iced tea.jpg",
        "File:Lipton lemon tea.jpg",
        "File:Tea bags box.jpg",
    ],
    "FreshBrew Moringa Tea": [
        "File:Moringa tea.jpg",
        "File:Moringa leaves tea.jpg",
        "File:Herbal tea bag.jpg",
        "File:Green herbal tea.jpg",
    ],
    "FusiCure 250mg Tablets": [
        "File:Fusidic acid.jpg",
        "File:Fucidin tablets.jpg",
        "File:Blister of tablets.jpg",
        "File:Antibiotic tablets.jpg",
    ],
    "SkinGold Betamethasone Cream": [
        "File:Betamethasone cream.jpg",
        "File:Betamethasone.jpg",
        "File:Corticosteroid cream.jpg",
        "File:Steroid cream tube.jpg",
    ],
    "ArteGold IV 60mg Injection": [
        "File:Injection vial.jpg",
        "File:IV medication vial.jpg",
        "File:Glass ampoule.jpg",
        "File:Drug ampoule JPN.jpg",
    ],
    "QuinaGold 200mg Tablets": [
        "File:Quinine tablets.jpg",
        "File:Quinine sulfate.jpg",
        "File:Quinine.jpg",
        "File:Blister of tablets.jpg",
    ],
    "VitaGold Iron 65mg Tablets": [
        "File:Ferrous sulfate tablets.jpg",
        "File:Iron tablets.jpg",
        "File:Iron supplement.jpg",
        "File:Blister of tablets.jpg",
    ],
    "VitaGold Zinc 20mg Tablets": [
        "File:Zinc tablets.jpg",
        "File:Zinc sulfate tablets.jpg",
        "File:Zinc supplement.jpg",
        "File:Dietary supplement tablets.jpg",
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
    url = commons_image_url(query_title)
    if url:
        return query_title
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

    # Prefer fixed sibling if present (OneDrive lock workaround).
    fixed_path = os.path.join(os.path.dirname(MANIFEST_PATH), "image_manifest.fixed.json")
    manifest_src = fixed_path if os.path.exists(fixed_path) else MANIFEST_PATH
    manifest = json.load(open(manifest_src, encoding="utf-8"))

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
        "-- Replace near-duplicate packaging-series photos with unique,",
        "-- product-matching Commons images. Idempotent by product/drug name.",
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

    with open(V22_PATH, "w", encoding="utf-8", newline="\n") as f:
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
    print(f"Wrote {V22_PATH}")


if __name__ == "__main__":
    main()
