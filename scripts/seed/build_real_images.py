"""
Build a manifest of REAL, distinct product photos (one per demo product) sourced
from Wikimedia Commons, resized/compressed to match the existing V13/V14 embedded
image convention, and emit a Flyway migration that updates image_url per product.

Usage: python scripts/seed/build_real_images.py
Writes:
  scripts/seed/image_manifest.json
  backend/src/main/resources/db/migration/V19__real_demo_images.sql
"""
import json, hashlib, base64, io, time, sys, os, re
import requests
from PIL import Image

# Wikimedia Commons' "filetype:bitmap" search surfaces a lot of digitized
# 19th/early-20th-century book & journal page scans (Internet Archive bulk
# uploads) and unrelated street/building photos that happen to keyword-match.
# These are real photographs but NOT real photographs of the product in
# question, so exclude them from candidate titles outright.
BAD_TITLE_PATTERN = re.compile(
    r"\(IA |\(serial\)|journal|magazine|cookery|cook book|cookbook|"
    r"ghost sign|shipwreck|colosseum|cathedral|catedral|directory for |guide to |"
    r"gossip|adviser|marriage guide|breeder and sportsman|electric batter|"
    r"nurse \(|clinical medicine|diseases of women|therapeutics|"
    r"natural history of plants|voyage des capitaines|home journal|"
    r"through the wilds|playing with baby|baby birds at home|"
    r"lady's book|novelties and specialties|"
    r"SPAR kolonial|Hannaford supermarket|ornamental trees|popular gardening|"
    r"tidewater cities|chemist and druggist|coffee company building|"
    r"canadian grocer|wild nature's ways|systematic-review|systematic review|"
    # Buildings / streets / freight trains / novelty merch / hormone tablets
    # that keyword-match product searches but are not photos of the product.
    r"headquarters|house of senator|dollands moor|wembley eau minerale|"
    r"naufragio a malta|transistor radio|headphone radio|novelty|"
    r"miniature grocery|food distribution center|lakeville rd|"
    r"\b(ADVERT|advert)\b|showcard advertising|"
    r"zumenon|progynova|estradiol|kai bo food supermarket|"
    r"szent istv|esztergom|sz[eé]kesfeh[eé]rv[aá]r|"
    r"boat tour|platter and drinks|malindi",
    re.I,
)

# Hand-picked overrides for a handful of products whose default term rotation
# kept losing to unrelated Commons hits (niche local drink names, generic
# supplement/topical names that collide with unrelated historical archives).
NAME_OVERRIDE_TERMS = {
    "ZenMalt Barley Drink": ["barley malt drink bottle", "Supermalt can", "Malta Guinness bottle"],
    "ClearFlow Mineral Water": ["mineral water bottle Evian", "sparkling mineral water bottle"],
    "BrewMaster Ginger Beer": ["ginger beer bottle Reed's", "ginger ale bottle"],
    "CoolSip Baobab Drink": ["baobab fruit powder pack", "baobab fruit pods"],
    "NatureBrew Ginger Drink": ["ginger drink bottle", "ginger ale bottle Canada Dry"],
    "GoldenSip Tigernut Drink": ["horchata bottle", "tigernut milk carton"],
    "ClearFry Corn Oil": ["Mazola corn oil bottle", "corn oil bottle kitchen"],
    "GoldCan Herrings in Tomato": ["canned herring tin", "tinned fish tomato sauce can"],
    "FreshSeason Tumeric Powder": ["turmeric powder spice jar", "ground turmeric spice bowl"],
    "FluEnd Cold Capsules": ["cold and flu capsules box", "cough and cold medicine box"],
    "NaturaBoost Baobab Powder": ["baobab powder jar supplement", "baobab fruit powder package"],
    "DermaCure Clotrimazole 1% Cream": ["clotrimazole cream tube", "antifungal cream tube"],
    "WoundCure Gentian Violet": ["gentian violet solution bottle", "gentian violet antiseptic"],
    "FakeORS Sachets": ["ORS sachet oral rehydration salts", "oral rehydration salts packet"],
    "OralRS Rehydration Sachets": ["WHO ORS sachet", "oral rehydration salts sachet packet", "rehydration salts powder packet"],
    "CoartiPlus 80/480mg Tablets": ["Coartem", "Coartem blister pack", "Coartem tablets box"],
    "CoartiPlus 20/120mg Tablets": ["Coartem", "Coartem blister pack", "Coartem tablets box"],
    "TropiGold Orange Juice": ["Ribbon orange juice glass bottle", "orange juice bottle close-up"],
    # Products that previously got buildings / freight trains / wrong-category photos
    "GoldBrew Malta": ["Malta Guinness bottle", "malt drink bottle", "Supermalt can"],
    "RefreshPlus Energy Drink": ["Red Bull can", "energy drink can Monster", "Predator energy drink can"],
    "AquaBliss Table Water": ["Voltic water bottle Ghana", "bottled drinking water", "Aquafina bottle"],
    "NaturePure Coconut Water": ["coconut water carton Vita Coco", "coconut water bottle", "young coconut drink"],
    "PureGold Sachet Water": ["sachet water Special Ice", "pure water sachet Ghana", "drinking water sachet"],
    "AquaVibe Sparkling Water": ["sparkling water bottle Perrier", "sparkling mineral water bottle"],
    "FreshFlow Waterfall Water": ["bottled spring water", "Evian water bottle", "Dasani bottle"],
    "AquaLife Pure Water Pack": ["pack of bottled water", "crate of water bottles", "Voltic water pack"],
    "SunCraft Pineapple Malt": ["pineapple juice drink bottle", "Malta Guinness bottle", "malt beverage can"],
    "ZenFresh Passion Fruit Drink": ["passion fruit juice bottle", "passionfruit drink carton"],
    "BrightDrop Strawberry Drink": ["strawberry juice drink bottle", "strawberry smoothie carton"],
    "PureSip Sorrel Drink": ["sorrel drink Jamaica bottle", "hibiscus sorrel drink"],
    "ZenBliss Soymilk Drink": ["soy milk carton Alpro", "Vitasoy soy milk", "soymilk carton"],
    "TropiBurst Tropical Mix": ["tropical juice carton", "mixed fruit juice bottle"],
    "NatureMalt Oat Drink": ["oat milk carton Oatly", "oat drink carton"],
    "TomBrown Roasted Cereal": ["roasted cereal porridge mix", "tom brown porridge Ghana", "cereal mix package"],
    "FreshPress Peanut Oil": ["peanut oil bottle", "groundnut oil bottle kitchen"],
    "TropiBite Cocoa Puffs": ["cocoa puffs cereal box", "chocolate cereal box"],
    "QuiniCure 300mg Tablets": ["quinine tablets blister", "quinine sulfate tablets"],
    "MoxiCure 400mg Tablets": ["moxifloxacin tablets box", "antibiotic tablets blister pack"],
    "StrepoGold 1g Injection": ["streptomycin injection vial", "antibiotic injection vial"],
    "PyraCure 500mg Tablets": ["pyrazinamide tablets blister", "TB medicine tablets box"],
    "MefloGold 250mg Tablets": ["mefloquine tablets blister", "Lariam tablets"],
    "CoolBreeze Pineapple Drink": ["pineapple juice bottle", "pineapple juice carton Del Monte"],
    "SunFresh Mango Nectar": ["mango nectar bottle", "mango juice carton", "mango puree drink bottle", "Alphonso mango juice"],
    "FruitBurst Mixed Juice": ["mixed fruit juice carton", "multivitamin juice bottle"],
    "TropiFresh Guava Drink": ["guava juice bottle", "guava nectar carton"],
    "TrueGold Apple Juice": ["apple juice bottle", "apple juice carton"],
    "FreshPick Watermelon Juice": ["watermelon juice bottle", "watermelon drink carton"],
    "NatureSip Tamarind Drink": ["tamarind drink bottle", "tamarind juice carton"],
    "TropiBreeze Mango Drink": ["mango juice bottle", "mango drink carton"],
    "BubbleFizz Lemon Drink": ["lemon soda bottle", "Sprite lemon bottle", "lemon soft drink"],
    "ZestPop Cola Drink": ["Coca-Cola bottle", "cola soft drink bottle"],
}

HEADERS = {"User-Agent": "FoodTraceGH-DemoSeeder/1.0 (contact: eugeneadade81@gmail.com)"}
API = "https://commons.wikimedia.org/w/api.php"
SESSION = requests.Session()
SESSION.headers.update(HEADERS)

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PRODUCTS_JSON = os.path.join(ROOT, "scripts", "seed", "products.json")
MANIFEST_PATH = os.path.join(ROOT, "scripts", "seed", "image_manifest.json")
MIGRATION_PATH = os.path.join(ROOT, "backend", "src", "main", "resources", "db", "migration", "V19__real_demo_images.sql")

VALID_EXT = (".jpg", ".jpeg", ".png")

# ── Real reference search terms per food category keyword ──────────────────
# Rotating lists of REAL, well-known, photographable products/brands per category
# so that many demo products in the same category get different real reference photos.
FOOD_CATEGORY_TERMS = {
    "water": ["Voltic water bottle", "Special Ice water sachet", "Aquafina bottle", "Evian bottle", "Dasani bottle"],
    "beverage": ["Malta Guinness bottle", "Supermalt can", "Amstel Malta bottle"],
    "juice": ["Minute Maid juice", "Tropicana orange juice", "Del Monte juice carton", "Ceres juice box", "Chivita juice Nigeria"],
    "malt": ["Malta Guinness bottle", "Supermalt can", "Amstel Malta bottle", "Malta Vita"],
    "energy": ["Red Bull can", "Predator energy drink", "Monster Energy can"],
    "hibiscus": ["hibiscus tea bottle", "Sobolo drink bottle", "Zobo drink Nigeria"],
    "squash": ["Five Alive squash", "Mirinda orange bottle"],
    "ginger beer": ["Reeds ginger beer bottle", "ginger beer bottle"],
    "baobab": ["baobab fruit powder package"],
    "tigernut": ["tigernut drink bottle", "horchata de chufa bottle"],
    "tea": ["Lipton tea box", "Twinings tea box", "Nescafe tea"],
    "sorrel": ["sorrel drink bottle Jamaica"],
    "soymilk": ["Vitasoy soy milk carton", "Alpro soy milk carton"],
    "soda": ["Coca-Cola bottle", "Fanta bottle", "Sprite bottle", "Pepsi bottle", "Mirinda bottle"],
    "oat": ["Quaker Oats box"],
    "rice": ["basmati rice bag", "jasmine rice bag", "Uncle Ben's rice", "rice sack Ghana"],
    "flour": ["wheat flour bag", "Golden Penny flour bag"],
    "banku": ["fermented corn dough Ghana"],
    "kenkey": ["kenkey Ghana food"],
    "fufu": ["fufu flour package", "cassava fufu flour"],
    "yam flour": ["pounded yam flour package", "elubo yam flour"],
    "millet": ["millet flour bag", "pearl millet grains bag"],
    "oats": ["Quaker Oats box"],
    "cereal": ["Kellogg's corn flakes box", "cereal box"],
    "cornmeal": ["cornmeal bag", "maize meal bag"],
    "semolina": ["semolina bag", "cream of wheat box"],
    "sorghum": ["sorghum flour bag", "sorghum grain bag"],
    "cassava": ["cassava flour bag", "garri Nigeria package"],
    "maize": ["maize corn bag", "yellow maize sack"],
    "plantain flour": ["plantain flour package"],
    "teff": ["teff flour bag Ethiopia"],
    "baking mix": ["pancake mix box", "baking flour bag"],
    "garri": ["garri package Nigeria"],
    "akple": ["fermented corn dough bowl Ghana"],
    "masa": ["masa cake Nigeria food"],
    "porridge": ["porridge oats bowl", "hausa koko porridge"],
    "tuo zaafi": ["tuo zaafi Ghana food"],
    "yam": ["yam tuber", "pounded yam dish"],
    "fermented corn": ["fermented corn dough bowl"],
    "grits": ["corn grits bag"],
    "corn": ["sweet corn cob", "maize cob"],
    "soybean": ["soybean bag", "soybeans package"],
    "bambara": ["bambara beans bag"],
    "cowpea": ["cowpea beans bag", "black eyed peas bag"],
    "groundnut": ["groundnuts bag", "peanuts bag"],
    "plantain": ["plantain fruit bunch"],
    "palm oil": ["palm oil bottle red", "red palm oil bottle"],
    "vegetable oil": ["Frytol vegetable oil bottle", "sunflower vegetable oil bottle"],
    "groundnut oil": ["peanut oil bottle"],
    "coconut oil": ["coconut oil jar"],
    "corn oil": ["Mazola corn oil bottle"],
    "soybean oil": ["soybean oil bottle"],
    "shea butter": ["shea butter jar Ghana"],
    "sesame oil": ["sesame oil bottle"],
    "sunflower oil": ["sunflower oil bottle"],
    "canola oil": ["canola oil bottle"],
    "cooking fat": ["Kobis cooking fat tin", "vegetable shortening tin"],
    "margarine": ["margarine tub", "Blue Band margarine"],
    "butter": ["butter block package", "Kerrygold butter"],
    "avocado oil": ["avocado oil bottle"],
    "moringa oil": ["moringa oil bottle"],
    "neem oil": ["neem oil bottle"],
    "olive oil": ["extra virgin olive oil bottle"],
    "peanut oil": ["peanut oil bottle"],
    "rice bran oil": ["rice bran oil bottle"],
    "baobab oil": ["baobab oil bottle"],
    "black seed oil": ["black seed oil bottle"],
    "castor oil": ["castor oil bottle"],
    "cottonseed oil": ["cottonseed oil bottle"],
    "palm kernel oil": ["palm kernel oil bottle"],
    "hemp oil": ["hemp seed oil bottle"],
    "almond oil": ["almond oil bottle"],
    "tigernut oil": ["tigernut oil bottle"],
    "flaxseed oil": ["flaxseed oil bottle"],
    "safflower oil": ["safflower oil bottle"],
    "walnut oil": ["walnut oil bottle"],
    "macadamia oil": ["macadamia oil bottle"],
    "grapeseed oil": ["grapeseed oil bottle"],
    "argan oil": ["argan oil bottle Morocco"],
    "cocoa butter": ["cocoa butter block"],
    "mustard oil": ["mustard oil bottle"],
    "mixed oil": ["cooking oil bottle"],
    "shortening": ["vegetable shortening tin Crisco"],
    "sardines": ["Titus sardines can", "tinned sardines can"],
    "tuna": ["canned tuna John West", "StarKist tuna can"],
    "mackerel": ["canned mackerel tin"],
    "pilchards": ["canned pilchards tin Glenryck"],
    "corned beef": ["Exeter corned beef tin", "corned beef tin"],
    "spread": ["chicken spread tin"],
    "baked beans": ["Heinz baked beans tin"],
    "peas": ["canned green peas tin"],
    "tomato paste": ["Gino tomato paste tin", "tomato paste tin"],
    "tomato": ["tomato puree can"],
    "vegetables": ["mixed vegetables can"],
    "beans": ["canned kidney beans tin"],
    "chickpeas": ["canned chickpeas tin"],
    "lentils": ["canned lentils tin"],
    "mushrooms": ["canned mushrooms tin"],
    "coconut milk": ["canned coconut milk Chaokoh"],
    "milk": ["evaporated milk tin Peak", "Peak milk tin"],
    "condensed milk": ["condensed milk tin Ideal"],
    "fruit": ["fruit cocktail can"],
    "pineapple": ["canned pineapple chunks tin Del Monte"],
    "mango": ["dried mango slices package"],
    "peach": ["canned peach halves tin"],
    "pear": ["canned pear halves tin"],
    "lychee": ["canned lychee tin"],
    "jackfruit": ["canned jackfruit tin"],
    "okra": ["okra in brine jar"],
    "egusi": ["egusi seeds package"],
    "kontomire": ["cocoyam leaves dish Ghana"],
    "peanut butter": ["peanut butter jar"],
    "jam": ["strawberry jam jar"],
    "jelly": ["guava jelly jar"],
    "shito": ["shito pepper sauce jar Ghana"],
    "dawadawa": ["locust bean seasoning package"],
    "crayfish": ["dried crayfish package"],
    "herring": ["canned herring tin tomato sauce"],
    "snails": ["canned snails tin"],
    "chocolate": ["Cadbury chocolate bar", "Kit Kat chocolate bar"],
    "peanut candy": ["peanut brittle bar"],
    "plantain chips": ["plantain chips bag"],
    "cassava chips": ["cassava chips bag"],
    "chin chin": ["chin chin snack Nigeria"],
    "biscuit": ["digestive biscuit pack", "cream cracker biscuit pack"],
    "coconut candy": ["coconut candy bar"],
    "spice": ["suya spice mix package"],
    "peanuts": ["roasted peanuts bag"],
    "sesame": ["sesame snap bar"],
    "toffee": ["toffee sweets bag"],
    "popcorn": ["caramel popcorn bag"],
    "yam crisps": ["potato crisps bag"],
    "cookie": ["cookies package"],
    "candy": ["mint candy roll"],
    "oat biscuit": ["oat biscuits pack"],
    "banana chips": ["banana chips bag"],
    "puff puff": ["puff puff snack Nigeria"],
    "bofrot": ["bofrot doughnut Ghana"],
    "corn puffs": ["corn puffs snack bag Cheetos"],
    "crackers": ["wheat crackers box"],
    "millet cookie": ["millet cookies pack"],
    "rice cake": ["rice cakes package"],
    "kuli kuli": ["kuli kuli snack Nigeria"],
    "coconut": ["coconut chips bag"],
    "breadfruit": ["breadfruit chips bag"],
    "moringa": ["moringa powder package"],
    "tamarind": ["tamarind candy package"],
    "groundnut cake": ["peanut candy bar"],
    "soya": ["soya crisps bag"],
    "almond": ["almonds bag"],
    "multigrain": ["granola bar package"],
    "shea": ["shea nut candy bar"],
    "zobo": ["zobo drink candy"],
    "pepper": ["dried chili pepper package"],
    "seasoning": ["Maggi seasoning cubes box", "Knorr seasoning cubes box"],
    "suya spice": ["suya spice mix Nigeria"],
    "curry": ["curry powder tin"],
    "garlic": ["garlic powder jar"],
    "ginger": ["ginger powder jar"],
    "uziza": ["uziza pepper seeds"],
    "cloves": ["cloves spice jar"],
    "ketchup": ["Heinz tomato ketchup bottle"],
    "chilli": ["chilli sauce bottle Tabasco"],
    "soup base": ["Maggi soup cube box"],
    "palm nut": ["palm nut cream can"],
    "prekese": ["prekese pod spice"],
    "turmeric": ["turmeric powder jar"],
    "cinnamon": ["cinnamon powder jar"],
    "bay leaves": ["bay leaves package"],
    "nutmeg": ["nutmeg spice jar"],
    "thyme": ["dried thyme jar"],
    "rosemary": ["dried rosemary jar"],
    "paprika": ["paprika powder jar"],
    "oyster sauce": ["oyster sauce bottle"],
    "soy sauce": ["Kikkoman soy sauce bottle"],
    "pepper soup": ["pepper soup spice mix"],
    "milk powder": ["Nido milk powder tin", "powdered milk tin"],
    "yoghurt": ["yoghurt cup Fage", "Danone yoghurt cup"],
    "cheese": ["cheese spread tub Laughing Cow"],
    "cream": ["whipping cream carton"],
    "sour cream": ["sour cream tub"],
    "creamer": ["Coffee-Mate creamer jar"],
    "baby cereal": ["Cerelac baby cereal box"],
    "baby porridge": ["infant porridge box"],
    "weaning food": ["baby food jar Gerber"],
    "baby oats": ["baby oat cereal box"],
    "baby millet": ["baby millet cereal box"],
    "baby food": ["Gerber baby food jar"],
    "formula": ["infant formula tin SMA", "baby formula tin"],
    "baby biscuit": ["baby biscuits box"],
    "baby rusk": ["teething rusks box"],
    "baby snack": ["puffed corn baby snack"],
    "baby pudding": ["rice pudding cup"],
}

DEFAULT_FOOD_TERMS = ["grocery product package", "food package"]

def food_search_terms(name, category):
    if name in NAME_OVERRIDE_TERMS:
        return NAME_OVERRIDE_TERMS[name] + FOOD_CATEGORY_TERMS.get(category, DEFAULT_FOOD_TERMS)
    return FOOD_CATEGORY_TERMS.get(category, DEFAULT_FOOD_TERMS)

DRUG_CATEGORY_FALLBACK = {
    "antibiotic": ["antibiotic capsules blister pack", "antibiotic tablets box"],
    "antifungal": ["antifungal tablets box"],
    "antimalarial": ["antimalarial tablets blister pack", "Coartem tablets box"],
    "analgesic": ["paracetamol tablets blister pack", "ibuprofen tablets box"],
    "vitamin": ["vitamin tablets bottle"],
    "supplement": ["dietary supplement capsules bottle"],
    "digestive": ["antacid tablets box"],
    "topical": ["medicated cream tube"],
    "eye": ["eye drops bottle"],
    "ear": ["ear drops bottle"],
    "nasal": ["nasal spray bottle"],
    "respiratory": ["inhaler device"],
    "herbal": ["herbal supplement bottle"],
    "cough": ["cough syrup bottle"],
    "water": ["bottled water"],
    "oil": ["cooking oil bottle"],
    "diabetes": ["insulin vial"],
    "steroid": ["steroid tablets bottle"],
}

def drug_search_terms(name, generic, category):
    terms = []
    if name in NAME_OVERRIDE_TERMS:
        terms += NAME_OVERRIDE_TERMS[name]
    terms += [f"{generic} tablets", f"{generic} capsules", f"{generic} packaging", f"{generic} medicine box"]
    terms += DRUG_CATEGORY_FALLBACK.get(category, ["medicine tablets box"])
    return terms

def commons_search(term, limit=20, offset=0):
    try:
        r = SESSION.get(API, params={
            "action": "query", "list": "search", "srsearch": f"{term} filetype:bitmap",
            "srnamespace": 6, "format": "json", "srlimit": limit, "sroffset": offset,
        }, timeout=15)
        r.raise_for_status()
        return [x["title"] for x in r.json().get("query", {}).get("search", [])]
    except Exception as e:
        print(f"    search error for {term!r}: {e}")
        return []

# Broad, high-yield fallback pools used as a last resort so every product still
# gets SOME real, distinct photo even when a specific brand/generic search comes
# up empty or all its candidates were already claimed by earlier products.
UNIVERSAL_DRUG_FALLBACK = [
    "tablets blister pack", "pill bottle medicine", "capsules medicine box",
    "pharmaceutical packaging", "prescription medicine bottle", "tablet strip",
    "OTC medicine box", "generic medication pack", "medicine box pharmacy",
    "drug vial pharmaceutical", "syrup bottle medicine", "ampoule injection medicine",
    "medicine blister pack", "pharmacy shelf medicine",
]
UNIVERSAL_FOOD_FALLBACK = [
    "grocery product package", "supermarket food package", "food packet",
    "consumer packaged goods", "canned food product", "snack food package",
    "beverage bottle product", "grocery item package", "food product label",
]

def commons_image_url(title):
    try:
        r = SESSION.get(API, params={
            "action": "query", "titles": title, "prop": "imageinfo",
            "iiprop": "url|size", "iiurlwidth": 320, "format": "json",
        }, timeout=15)
        r.raise_for_status()
        pages = r.json().get("query", {}).get("pages", {})
        for p in pages.values():
            info = p.get("imageinfo")
            if info:
                # Prefer the pre-scaled thumbnail (much smaller/faster than full res)
                return info[0].get("thumburl") or info[0]["url"]
    except Exception as e:
        print(f"    imageinfo error for {title!r}: {e}")
    return None

def process_image(raw_bytes):
    im = Image.open(io.BytesIO(raw_bytes))
    im = im.convert("RGB")
    w, h = im.size
    long_edge = max(w, h)
    if long_edge > 320:
        scale = 320 / long_edge
        im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, format="JPEG", quality=75, optimize=True)
    return buf.getvalue()

def find_unique_image(terms, used_hashes, used_titles, max_candidates=20):
    for term in terms:
        titles = commons_search(term, limit=20)
        if not titles:
            continue
        for title in titles:
            if not title.lower().endswith(VALID_EXT):
                continue
            if BAD_TITLE_PATTERN.search(title):
                continue
            if title in used_titles:
                continue
            used_titles.add(title)
            url = commons_image_url(title)
            time.sleep(0.35)
            if not url:
                continue
            try:
                resp = SESSION.get(url, timeout=20)
                resp.raise_for_status()
            except Exception as e:
                print(f"    download error for {title!r}: {e}")
                continue
            try:
                jpeg_bytes = process_image(resp.content)
            except Exception as e:
                print(f"    process error for {title!r}: {e}")
                continue
            digest = hashlib.sha256(jpeg_bytes).hexdigest()
            if digest in used_hashes:
                continue
            return title, url, jpeg_bytes, digest
        time.sleep(0.3)
    return None

def main():
    products = json.load(open(PRODUCTS_JSON, encoding="utf-8"))
    food = products["food"]
    drug = products["drug"]

    manifest = {}
    used_hashes = set()
    used_titles = set()

    if os.path.exists(MANIFEST_PATH):
        manifest = json.load(open(MANIFEST_PATH, encoding="utf-8"))
        for v in manifest.values():
            used_hashes.add(v["sha256"])
            used_titles.add(v["commons_title"])
        print(f"Resuming with {len(manifest)} already-resolved products")

    total = len(food) + len(drug)
    done = 0

    for name, category in food:
        done += 1
        if name in manifest:
            continue
        print(f"[{done}/{total}] FOOD {name} ({category})")
        terms = food_search_terms(name, category)
        result = find_unique_image(terms, used_hashes, used_titles)
        if not result:
            result = find_unique_image(DEFAULT_FOOD_TERMS + [category], used_hashes, used_titles)
        if not result:
            result = find_unique_image(UNIVERSAL_FOOD_FALLBACK, used_hashes, used_titles)
        if not result:
            print(f"    !!! NO IMAGE FOUND for {name}")
            continue
        title, url, jpeg_bytes, digest = result
        used_hashes.add(digest)
        b64 = base64.b64encode(jpeg_bytes).decode("ascii")
        manifest[name] = {
            "category": category, "type": "food",
            "commons_title": title, "source_url": url,
            "sha256": digest, "bytes": len(jpeg_bytes),
            "data_uri": f"data:image/jpeg;base64,{b64}",
        }
        json.dump(manifest, open(MANIFEST_PATH, "w", encoding="utf-8"))

    for name, generic, category, code in drug:
        done += 1
        if name in manifest:
            continue
        print(f"[{done}/{total}] DRUG {name} ({generic}/{category})")
        terms = drug_search_terms(name, generic, category)
        result = find_unique_image(terms, used_hashes, used_titles)
        if not result:
            result = find_unique_image(DRUG_CATEGORY_FALLBACK.get(category, ["medicine tablets box"]), used_hashes, used_titles)
        if not result:
            result = find_unique_image(UNIVERSAL_DRUG_FALLBACK, used_hashes, used_titles)
        if not result:
            print(f"    !!! NO IMAGE FOUND for {name}")
            continue
        title, url, jpeg_bytes, digest = result
        used_hashes.add(digest)
        b64 = base64.b64encode(jpeg_bytes).decode("ascii")
        manifest[name] = {
            "category": category, "type": "drug", "generic": generic,
            "commons_title": title, "source_url": url,
            "sha256": digest, "bytes": len(jpeg_bytes),
            "data_uri": f"data:image/jpeg;base64,{b64}",
        }
        json.dump(manifest, open(MANIFEST_PATH, "w", encoding="utf-8"))

    print(f"\nDone. {len(manifest)}/{total} products resolved.")

    missing_food = [n for n, c in food if n not in manifest]
    missing_drug = [n for n, g, c, code in drug if n not in manifest]
    if missing_food or missing_drug:
        print(f"MISSING food: {missing_food}")
        print(f"MISSING drug: {missing_drug}")

if __name__ == "__main__":
    main()
