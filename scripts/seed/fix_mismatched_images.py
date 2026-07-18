"""
Re-fetch product-matching Wikimedia photos for mismatched demo products using
hand-picked Commons file titles (search alone kept returning buildings / dogs /
HQ photos), then emit V20__fix_mismatched_demo_images.sql.
"""
from __future__ import annotations

import base64
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

V20_PATH = os.path.join(
    ROOT, "backend", "src", "main", "resources", "db", "migration",
    "V20__fix_mismatched_demo_images.sql",
)

# Verified Commons titles — real product photos, one distinct file per product.
DIRECT_COMMONS_TITLES = {
    # Drinks / water (no buildings, no freight trains, no dogs)
    "GoldBrew Malta": "File:David Nicholson's Liquid Bread (back).jpg",
    "RefreshPlus Energy Drink": "File:Monster Energy Mega can.jpg",
    "AquaBliss Table Water": "File:Dasani Water Bottle.jpg",
    "NaturePure Coconut Water": "File:Manufacturing address and marketing mismatch in tender coconut water bottle.jpg",
    "PureGold Sachet Water": "File:Two children drinking sachet water.jpg",
    "AquaVibe Sparkling Water": "File:PERRIER (14).jpg",
    "FreshFlow Waterfall Water": "File:Evian Label-Free Bottle.jpg",
    "AquaLife Pure Water Pack": "File:Evian water bottles on SM Hypermarket at SM J Mall (2024-12-30).jpg",
    "SunCraft Pineapple Malt": "File:Pineapple Juice fruits-465832.jpg",
    "ZenFresh Passion Fruit Drink": "File:Passion fruit juice.jpg",
    "BrightDrop Strawberry Drink": "File:Strawberry-juice.png",
    "PureSip Sorrel Drink": "File:Homemade sorrel drink.jpg",
    "ZenBliss Soymilk Drink": "File:Soy milk.jpg",
    "TropiBurst Tropical Mix": "File:Cocktail of passion fruit juice and watermelon juice in a glass.jpg",
    "NatureMalt Oat Drink": "File:Oatly.jpg",
    "TomBrown Roasted Cereal": "File:Kellogg Company. Women Inspecting Filled Boxes of Cereal before Boxes Go to Sealer (3903229587).jpg",
    "FreshPress Peanut Oil": "File:Peanut oil bottle.jpg",
    "TropiBite Cocoa Puffs": "File:General Mills Cocoa Puffs – Naturally Flavored Frosted Corn Puffs, with milk.jpg",
    "CoolBreeze Pineapple Drink": "File:Pineapple juice mixed with pear-lemon-chia seeds-2860722.jpg",
    "SunFresh Mango Nectar": "File:Mango Juice 05.jpg",
    "FruitBurst Mixed Juice": "File:Collection of French artisanal apple juices.jpg",
    "TropiFresh Guava Drink": "File:Sun Tropics guava juice.JPG",
    "TrueGold Apple Juice": "File:2021-04-20 19 09 13 A bottle of Abound Unsweetened Organic Apple Juice in the Franklin Farm section of Oak Hill, Fairfax County, Virginia.jpg",
    "FreshPick Watermelon Juice": "File:Watermelon Juice 1.jpg",
    "NatureSip Tamarind Drink": "File:Fresh Tamarind Juice.jpg",
    "TropiBreeze Mango Drink": "File:Mango pulp juice.jpg",
    "BubbleFizz Lemon Drink": "File:Sprite Glass Bottle.jpg",
    "ZestPop Cola Drink": "File:Coca-Cola glass bottle.jpg",
    # Also fix other malt products that showed Malta-the-island / sculptures
    "GoldenMalt Premium": "File:Battery Energy Drink-can-bottle.jpg",
    "SunMalt Gold Edition": "File:Speed Can Energy Drink 250ml.jpg",
    "ClearMalt Brown Malt": "File:Energy Drink Battery Cans.jpg",
    # Drugs that had hormone packs / showcards
    "QuiniCure 300mg Tablets": "File:Bottle of quinine hydrochloride tablets, London, England, 19 Wellcome L0058217.jpg",
    "MoxiCure 400mg Tablets": "File:Moxifloxacin-Vigamox.jpg",
    "StrepoGold 1g Injection": "File:Drug ampoule JPN.jpg",
    "PyraCure 500mg Tablets": "File:PZA Lora Kielce.jpg",
    "MefloGold 250mg Tablets": "File:Hydroxychloroquine.jpg",
}



def sql_escape(s: str) -> str:
    return s.replace("'", "''")


def save_manifest(manifest: dict) -> None:
    """Write manifest via a sibling file then PowerShell copy (OneDrive-safe)."""
    alt = os.path.join(os.path.dirname(MANIFEST_PATH), "image_manifest.fixed.json")
    with open(alt, "w", encoding="utf-8", newline="\n") as out:
        json.dump(manifest, out)
        out.flush()
        os.fsync(out.fileno())
    # Prefer shutil copy; fall back to leaving .fixed.json if target is locked.
    import shutil
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
    time.sleep(0.3)
    if not url:
        return None
    resp = SESSION.get(url, timeout=30)
    resp.raise_for_status()
    jpeg = process_image(resp.content)
    digest = __import__("hashlib").sha256(jpeg).hexdigest()
    return title, url, jpeg, digest


def main() -> None:
    import hashlib

    products = json.load(open(PRODUCTS_JSON, encoding="utf-8"))
    food_meta = {n: c for n, c in products["food"]}
    drug_meta = {n: (g, c) for n, g, c, _code in products["drug"]}

    manifest = json.load(open(MANIFEST_PATH, encoding="utf-8"))

    # Prefer unique titles not already used by products we are NOT refreshing.
    refresh_names = [n for n in DIRECT_COMMONS_TITLES if n in manifest]
    used_hashes = {e["sha256"] for n, e in manifest.items() if n not in refresh_names}
    used_titles = {e["commons_title"] for n, e in manifest.items() if n not in refresh_names}

    # Alternate drug images if primary collides
    DRUG_ALTERNATES = {
        "StrepoGold 1g Injection": [
            "File:Drug ampoule JPN.jpg",
            "File:Ampoule.jpg",
        ],
        "MefloGold 250mg Tablets": [
            "File:Hydroxychloroquine.jpg",
            "File:Blister of tablets.jpg",
            "File:Blister pack.jpg",
        ],
        "MoxiCure 400mg Tablets": [
            "File:Moxifloxacin-Vigamox.jpg",
            "File:Blister of tablets.jpg",
        ],
        "GoldenMalt Premium": [
            "File:Battery Energy Drink-can-bottle.jpg",
            "File:Speed Can Energy Drink 250ml.jpg",
            "File:Energy Drink Battery Cans.jpg",
            "File:Headshot energy drink 365ml 200mg cafeine and L Tyrosine.jpg",
            "File:Monster Energy drinks 09.jpg",
        ],
        "SunMalt Gold Edition": [
            "File:Speed Can Energy Drink 250ml.jpg",
            "File:Energy Drink Battery Cans.jpg",
            "File:Headshot energy drink 365ml 200mg cafeine and L Tyrosine.jpg",
            "File:Monster Energy drinks 09.jpg",
            "File:Monster Energy drinks 04.jpg",
        ],
        "ClearMalt Brown Malt": [
            "File:Energy Drink Battery Cans.jpg",
            "File:Headshot energy drink 365ml 200mg cafeine and L Tyrosine.jpg",
            "File:Monster Energy drinks 04.jpg",
            "File:Monster Energy drinks 10.jpg",
        ],
        "GoldBrew Malta": [
            "File:David Nicholson's Liquid Bread (back).jpg",
            "File:David Nicholson's Liquid Bread (front).jpg",
            "File:Monster Energy drinks 08.jpg",
        ],
        "RefreshPlus Energy Drink": [
            "File:Monster Energy Mega can.jpg",
            "File:Monster Energy drinks 09.jpg",
            "File:Monster Energy drinks 13.jpg",
        ],
    }

    fixed = []
    failed = []
    for i, name in enumerate(refresh_names, 1):
        primary = DIRECT_COMMONS_TITLES[name]
        candidates = [primary] + [t for t in DRUG_ALTERNATES.get(name, []) if t != primary]
        print(f"[{i}/{len(refresh_names)}] {name}")
        result = None
        for title in candidates:
            if title in used_titles:
                print(f"    skip used title {title}")
                continue
            try:
                result = download_title(title)
            except Exception as e:
                print(f"    download fail {title}: {e}")
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
        # Defer manifest disk write — OneDrive/AV locks the huge JSON mid-run on Windows.

    save_manifest(manifest)
    print(f"Manifest saved ({len(fixed)} updates)")

    lines = [
        "-- Fix demo product images that previously pointed at buildings,",
        "-- freight trains, novelty merch, hormone packs, or near-duplicate",
        "-- series photos. One unique, product-matching photo per name.",
        "-- Idempotent: matches by product/drug name and only updates image_url.",
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

    with open(V20_PATH, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines) + "\n")

    # uniqueness check
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
    print(f"Wrote {V20_PATH}")


if __name__ == "__main__":
    main()
