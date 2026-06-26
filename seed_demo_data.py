"""
FoodTrace GH — Demo Data Seeder
Seeds 500 products (300 food batches + 200 drug batches) into the Render backend.
Run: python seed_demo_data.py
"""

import requests, json, time, random, sys
from datetime import date, timedelta

BASE = "https://foodtrace-gh.onrender.com/api"

def post(url, body, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = requests.post(f"{BASE}{url}", json=body, headers=headers, timeout=30)
    return r

def register_and_login(full_name, phone, password, role):
    r = post("/auth/register", {"fullName": full_name, "phone": phone, "password": password, "role": role, "language": "en"})
    if r.status_code == 200:
        return r.json()["token"]
    # Already exists — try login
    r2 = post("/auth/login", {"identifier": phone, "password": password})
    if r2.status_code == 200:
        return r2.json()["token"]
    print(f"  ERROR registering/logging in {full_name}: {r.text}")
    sys.exit(1)

# ── Product name lists ────────────────────────────────────────────────────────

FOOD_PRODUCTS = [
    # Beverages (50)
    ("AquaFresh Pure Water", "water"), ("ZenMalt Barley Drink", "beverage"),
    ("TropiGold Orange Juice", "juice"), ("CoolBreeze Pineapple Drink", "juice"),
    ("SunFresh Mango Nectar", "juice"), ("GoldBrew Malta", "malt"),
    ("RefreshPlus Energy Drink", "energy"), ("AquaBliss Table Water", "water"),
    ("NaturePure Coconut Water", "water"), ("SunSip Sobolo Drink", "hibiscus"),
    ("ClearFlow Mineral Water", "water"), ("FruitBurst Mixed Juice", "juice"),
    ("GoldenMalt Premium", "malt"), ("TropiFresh Guava Drink", "juice"),
    ("ZestPop Cola Drink", "soda"), ("BubbleFizz Lemon Drink", "soda"),
    ("BrewMaster Ginger Beer", "ginger beer"), ("SunRise Orange Squash", "squash"),
    ("PureGold Sachet Water", "water"), ("AquaVibe Sparkling Water", "water"),
    ("TrueGold Apple Juice", "juice"), ("FreshPick Watermelon Juice", "juice"),
    ("NatureSip Tamarind Drink", "juice"), ("SunCraft Pineapple Malt", "malt"),
    ("CoolSip Baobab Drink", "baobab"), ("ZenFresh Passion Fruit Drink", "juice"),
    ("BrightDrop Strawberry Drink", "juice"), ("NatureBrew Ginger Drink", "ginger"),
    ("ClearSip Zobo Drink", "hibiscus"), ("FreshFlow Waterfall Water", "water"),
    ("SunMalt Gold Edition", "malt"), ("TropiBreeze Mango Drink", "juice"),
    ("AquaLife Pure Water Pack", "water"), ("GoldenSip Tigernut Drink", "tigernut"),
    ("LifeFresh Lemon Tea", "tea"), ("PureSip Sorrel Drink", "sorrel"),
    ("ZenBliss Soymilk Drink", "soymilk"), ("CoolPop Grape Soda", "soda"),
    ("TropiBurst Tropical Mix", "juice"), ("SunSip Roselle Drink", "hibiscus"),
    ("AquaGold Premium Water", "water"), ("FreshBrew Moringa Tea", "tea"),
    ("NatureMalt Oat Drink", "oat"), ("SunDrop Citrus Blend", "juice"),
    ("ClearMalt Brown Malt", "malt"), ("ZestFresh Beetroot Juice", "juice"),
    ("BubblePop Orange Soda", "soda"), ("TropiGold Pineapple Malt", "malt"),
    ("AquaCool Sachet Water", "water"), ("SunSip Bissap Drink", "hibiscus"),

    # Grains & Staples (50)
    ("GoldenKernel Parboiled Rice", "rice"), ("SunGrain Basmati Rice", "rice"),
    ("FreshMill Corn Flour", "flour"), ("NatureMill Wheat Flour", "flour"),
    ("GoldBanku Fermented Mix", "banku"), ("TropiKenkey Corn Dough", "kenkey"),
    ("FuFuPower Cassava Mix", "fufu"), ("SunStarch Yam Flour", "yam flour"),
    ("GrainGold Long Grain Rice", "rice"), ("NaturePearl Millet Flour", "millet"),
    ("SunBrew Oats Porridge", "oats"), ("TomBrown Roasted Cereal", "cereal"),
    ("GoldGrit Cornmeal", "cornmeal"), ("SunMill Semolina", "semolina"),
    ("FreshGrain Sorghum Flour", "sorghum"), ("NatureCraft Kokonte", "cassava"),
    ("GoldenPearl Polished Rice", "rice"), ("SunGold Brown Rice", "rice"),
    ("CornKing Yellow Maize", "maize"), ("TropiFufu Plantain Mix", "plantain flour"),
    ("GrainMaster Wholegrain Flour", "flour"), ("SunBake Bread Flour", "flour"),
    ("NatureGold Teff Flour", "teff"), ("FreshBake Baking Mix", "baking mix"),
    ("GoldCraft Eba Garri", "garri"), ("SunGrain Ofada Rice", "rice"),
    ("TropiMill Fermented Corn", "corn"), ("NatureMix Akple Dough", "akple"),
    ("GoldenHusk Husked Millet", "millet"), ("SunCraft Akyeke", "cassava"),
    ("GrainPure Masa Mix", "masa"), ("FreshMill Hausa Koko Mix", "porridge"),
    ("NatureGrain Tuo Zaafi Mix", "tuo zaafi"), ("GoldGrain Mpotompoto Mix", "yam"),
    ("SunStaple Abolo Mix", "fermented corn"), ("TropiGrain Fante Kenkey", "kenkey"),
    ("NatureBake Sobolo Flour", "flour"), ("GoldBrew Koko Porridge Mix", "porridge"),
    ("SunMill Corn Grits", "grits"), ("FreshGrain Nixtamal Corn", "corn"),
    ("GoldenStaple Pounded Yam", "yam"), ("NatureKernel Sticky Rice", "rice"),
    ("SunGold Jasmine Rice", "rice"), ("TropiKernel Broken Rice", "rice"),
    ("GrainHouse Soybean Flour", "soybean"), ("FreshMill Bambara Flour", "bambara"),
    ("NaturePearl Cowpea Flour", "cowpea"), ("GoldMill Tiger Nut Flour", "tigernut"),
    ("SunGrain Groundnut Flour", "groundnut"), ("TropiMill Plantain Flour", "plantain"),

    # Oils & Fats (40)
    ("GoldPress Palm Oil", "palm oil"), ("SunFry Vegetable Oil", "vegetable oil"),
    ("NatureFry Groundnut Oil", "groundnut oil"), ("TropiFry Coconut Oil", "coconut oil"),
    ("ClearFry Corn Oil", "corn oil"), ("GoldFry Soybean Oil", "soybean oil"),
    ("SunPress Shea Butter", "shea butter"), ("NaturePress Sesame Oil", "sesame oil"),
    ("TropiGold Sunflower Oil", "sunflower oil"), ("FreshFry Canola Oil", "canola oil"),
    ("GoldBlend Cooking Fat", "cooking fat"), ("SunBlend Margarine Spread", "margarine"),
    ("NatureMelt Butter Blend", "butter"), ("TropiFry Red Palm Oil", "palm oil"),
    ("ClearPress Avocado Oil", "avocado oil"), ("GoldCraft Moringa Oil", "moringa oil"),
    ("SunFry Frytol Premium", "vegetable oil"), ("NatureFry Neem Oil", "neem oil"),
    ("TropiBlend Olive Mix Oil", "olive oil"), ("FreshPress Peanut Oil", "peanut oil"),
    ("GoldFry Rice Bran Oil", "rice bran oil"), ("SunPress Baobab Oil", "baobab oil"),
    ("NatureCraft Black Seed Oil", "black seed oil"), ("TropiFry Castor Oil", "castor oil"),
    ("ClearBlend Cottonseed Oil", "cottonseed oil"), ("GoldMelt Lard Substitute", "cooking fat"),
    ("SunFry Palm Kernel Oil", "palm kernel oil"), ("NaturePress Hemp Seed Oil", "hemp oil"),
    ("TropiCraft Almond Oil", "almond oil"), ("FreshFry Tigernut Oil", "tigernut oil"),
    ("GoldBlend Flaxseed Oil", "flaxseed oil"), ("SunFry Safflower Oil", "safflower oil"),
    ("NatureFry Walnut Oil", "walnut oil"), ("TropiPress Macadamia Oil", "macadamia oil"),
    ("ClearFry Grapeseed Oil", "grapeseed oil"), ("GoldPress Argan Oil", "argan oil"),
    ("SunMelt Cocoa Butter", "cocoa butter"), ("NatureFry Mustard Oil", "mustard oil"),
    ("TropiBlend Mixed Frying Oil", "mixed oil"), ("FreshFry Premium Shortening", "shortening"),

    # Canned & Packaged (40)
    ("OceanGold Sardines in Oil", "sardines"), ("SeaFresh Tuna Chunks", "tuna"),
    ("TigerFish Mackerel Fillets", "mackerel"), ("OceanBlue Pilchards", "pilchards"),
    ("NaturePack Corned Beef", "corned beef"), ("GoldPack Chicken Spread", "spread"),
    ("TropiCan Baked Beans", "baked beans"), ("FreshPack Green Peas", "peas"),
    ("GoldCan Tomato Paste", "tomato paste"), ("SunPack Tomato Puree", "tomato"),
    ("NatureCan Mixed Vegetables", "vegetables"), ("TropiPack Sweetcorn", "corn"),
    ("FreshCan Kidney Beans", "beans"), ("GoldPack Chickpeas", "chickpeas"),
    ("SunCan Lentils", "lentils"), ("NaturePack Mushrooms", "mushrooms"),
    ("TropiCan Coconut Milk", "coconut milk"), ("FreshPack Evaporated Milk", "milk"),
    ("GoldCan Condensed Milk", "condensed milk"), ("SunPack Fruit Cocktail", "fruit"),
    ("NatureCan Pineapple Chunks", "pineapple"), ("TropiPack Mango Slices", "mango"),
    ("FreshCan Peach Halves", "peach"), ("GoldPack Pear Halves", "pear"),
    ("SunCan Lychee Fruits", "lychee"), ("NaturePack Black-eyed Peas", "cowpea"),
    ("TropiCan Jackfruit", "jackfruit"), ("FreshPack Okra in Brine", "okra"),
    ("GoldCan Groundnut Paste", "groundnut"), ("SunPack Egusi Paste", "egusi"),
    ("NatureCan Kontomire Paste", "kontomire"), ("TropiPack Peanut Butter", "peanut butter"),
    ("FreshCan Mango Jam", "jam"), ("GoldPack Pineapple Jam", "jam"),
    ("SunCan Guava Jelly", "jelly"), ("NaturePack Shito Paste", "shito"),
    ("TropiCan Fermented Locust Beans", "dawadawa"), ("FreshPack Crayfish Paste", "crayfish"),
    ("GoldCan Herrings in Tomato", "herring"), ("SunPack Snails in Brine", "snails"),

    # Snacks & Confectionery (40)
    ("GoldBite Chocolate Bar", "chocolate"), ("SunSnack Peanut Brittle", "peanut candy"),
    ("TropiBite Plantain Chips", "plantain chips"), ("FreshCrunch Cassava Chips", "cassava chips"),
    ("NatureBite Chin Chin", "chin chin"), ("GoldCrunch Biscuit Assorted", "biscuit"),
    ("SunBite Coconut Candy", "coconut candy"), ("TropiBite Kelewele Spice Mix", "spice"),
    ("FreshSnack Roasted Peanuts", "peanuts"), ("NatureCrunch Sesame Snaps", "sesame"),
    ("GoldSweet Toffee Assorted", "toffee"), ("SunBite Popcorn Caramel", "popcorn"),
    ("TropiSnack Yam Crisps", "yam crisps"), ("FreshBite Gari Cookies", "cookie"),
    ("NatureBite Tiger Nut Snack", "tigernut"), ("GoldSweet Peppermint Candy", "candy"),
    ("SunCrunch Oat Biscuits", "oat biscuit"), ("TropiBite Cocoa Puffs", "cereal"),
    ("FreshBite Banana Chips", "banana chips"), ("NatureCrunch Jackfruit Chips", "jackfruit"),
    ("GoldBite Puff Puff Mix", "puff puff"), ("SunSnack Bofrot Mix", "bofrot"),
    ("TropiCrunch Corn Puffs", "corn puffs"), ("FreshBite Wheat Crackers", "crackers"),
    ("NatureBite Millet Cookies", "millet cookie"), ("GoldCrunch Rice Cakes", "rice cake"),
    ("SunBite Kuli Kuli", "kuli kuli"), ("TropiSnack Coconut Chips", "coconut"),
    ("FreshCrunch Breadfruit Chips", "breadfruit"), ("NatureBite Moringa Crackers", "moringa"),
    ("GoldSweet Baobab Candy", "baobab"), ("SunBite Tamarind Candy", "tamarind"),
    ("TropiBite Groundnut Cake", "groundnut cake"), ("FreshCrunch Soya Crisps", "soya"),
    ("NatureSnack Almond Brittle", "almond"), ("GoldBite Choco Mint Bar", "chocolate"),
    ("SunCrunch Multigrain Snack", "multigrain"), ("TropiBite Dried Mango Strips", "mango"),
    ("FreshBite Shea Nut Candy", "shea"), ("NatureCrunch Zobo Candy", "zobo"),

    # Spices & Condiments (30)
    ("GoldSpice Pepper Mix", "pepper"), ("SunSeason All Purpose Seasoning", "seasoning"),
    ("TropiSpice Suya Pepper", "suya spice"), ("FreshSeason Jollof Seasoning", "seasoning"),
    ("NatureSpice Curry Powder", "curry"), ("GoldSeason Garlic Powder", "garlic"),
    ("SunSpice Ginger Powder", "ginger"), ("TropiSeason Uziza Leaves", "uziza"),
    ("FreshSpice Cameroon Pepper", "pepper"), ("NatureSeason Cloves Powder", "cloves"),
    ("GoldSauce Tomato Ketchup", "ketchup"), ("SunSauce Chilli Sauce", "chilli"),
    ("TropiSauce Groundnut Soup Base", "soup base"), ("FreshSauce Palm Nut Cream", "palm nut"),
    ("NatureSauce Shito Hot Sauce", "shito"), ("GoldSpice Dawadawa Powder", "dawadawa"),
    ("SunSeason Egusi Powder", "egusi"), ("TropiSpice Prekese Powder", "prekese"),
    ("FreshSeason Tumeric Powder", "turmeric"), ("NatureSpice Cinnamon Ground", "cinnamon"),
    ("GoldSeason Bay Leaves", "bay leaves"), ("SunSpice Nutmeg Ground", "nutmeg"),
    ("TropiSeason Thyme Dried", "thyme"), ("FreshSpice Rosemary Dried", "rosemary"),
    ("NatureSeason Paprika Smoked", "paprika"), ("GoldSauce Oyster Sauce", "oyster sauce"),
    ("SunSauce Soy Sauce Premium", "soy sauce"), ("TropiSauce Pepper Soup Spice", "pepper soup"),
    ("FreshSpice Onga Seasoning", "seasoning"), ("NatureSeason Crayfish Ground", "crayfish"),

    # Dairy (20)
    ("MilkyPure Full Cream Milk Powder", "milk powder"),
    ("SunDairy Skimmed Milk Powder", "milk powder"),
    ("TropiMilk Instant Whole Milk", "milk"), ("FreshDairy Evaporated Milk", "milk"),
    ("NatureMilk Condensed Sweetened", "condensed milk"),
    ("GoldDairy Yoghurt Strawberry", "yoghurt"), ("SunYoghurt Mango Flavour", "yoghurt"),
    ("TropiYoghurt Natural Plain", "yoghurt"), ("FreshDairy Cheese Spread", "cheese"),
    ("NatureCream Butter Unsalted", "butter"), ("GoldMilk Lactose Free Milk", "milk"),
    ("SunDairy Fortified Milk Powder", "milk powder"),
    ("TropiCream Whipping Cream", "cream"), ("FreshMilk UHT Long Life Milk", "milk"),
    ("NatureDairy Sour Cream", "sour cream"), ("GoldYoghurt Probiotic Drink", "yoghurt"),
    ("SunCream Coffee Creamer", "creamer"), ("TropiDairy Flavoured Milk", "milk"),
    ("FreshCream Clotted Cream", "cream"), ("NatureMilk Coconut Milk Powder", "coconut milk"),

    # Baby Foods (20)
    ("BabyGold Infant Cereal Rice", "baby cereal"),
    ("SunBaby Infant Porridge Mix", "baby porridge"),
    ("TropiBaby Weaning Food Mix", "weaning food"),
    ("FreshBaby Stage 1 Cereal", "baby cereal"),
    ("NatureBaby Oat Porridge", "baby oats"),
    ("GoldBaby Millet Porridge", "baby millet"),
    ("SunBaby Fruit Puree Apple", "baby food"),
    ("TropiBaby Mango Banana Puree", "baby food"),
    ("FreshBaby Sweet Potato Mix", "baby food"),
    ("NatureBaby Carrot Pea Puree", "baby food"),
    ("GoldBaby Follow-On Formula", "formula"),
    ("SunBaby Starter Formula", "formula"),
    ("TropiBaby Growing Up Milk", "formula"),
    ("FreshBaby Soy Infant Formula", "formula"),
    ("NatureBaby Toddler Biscuits", "baby biscuit"),
    ("GoldBaby Teething Rusks", "baby rusk"),
    ("SunBaby Puffed Corn Snack", "baby snack"),
    ("TropiBaby Rice Pudding", "baby pudding"),
    ("FreshBaby Corn & Veggie Mix", "baby food"),
    ("NatureBaby Protein Porridge", "baby porridge"),
]

DRUG_PRODUCTS = [
    # Antibiotics (40)
    ("AmoxiCure 250mg Capsules", "Amoxicillin", "antibiotic", "AMOXI-250"),
    ("AmoxiCure 500mg Capsules", "Amoxicillin", "antibiotic", "AMOXI-500"),
    ("PeniciCure 250mg Tablets", "Penicillin V", "antibiotic", "PENIC-250"),
    ("AmpiciGold 250mg Capsules", "Ampicillin", "antibiotic", "AMPIC-250"),
    ("CloxaCure 500mg Capsules", "Cloxacillin", "antibiotic", "CLOXA-500"),
    ("CiprobidGH 500mg Tablets", "Ciprofloxacin", "antibiotic", "CIPRO-500"),
    ("CiprobidGH 250mg Tablets", "Ciprofloxacin", "antibiotic", "CIPRO-250"),
    ("OfloxiCure 400mg Tablets", "Ofloxacin", "antibiotic", "OFLOX-400"),
    ("EryGold 250mg Tablets", "Erythromycin", "antibiotic", "ERYTH-250"),
    ("EryGold 500mg Tablets", "Erythromycin", "antibiotic", "ERYTH-500"),
    ("AzithroPlus 500mg Tablets", "Azithromycin", "antibiotic", "AZITH-500"),
    ("DoxyCure 100mg Capsules", "Doxycycline", "antibiotic", "DOXY-100"),
    ("TetracyGold 250mg Capsules", "Tetracycline", "antibiotic", "TETRA-250"),
    ("MetroGold 400mg Tablets", "Metronidazole", "antibiotic", "METRO-400"),
    ("MetroGold 200mg Tablets", "Metronidazole", "antibiotic", "METRO-200"),
    ("TrimSulfa 480mg Tablets", "Co-trimoxazole", "antibiotic", "COTRI-480"),
    ("TrimSulfa 960mg Tablets", "Co-trimoxazole", "antibiotic", "COTRI-960"),
    ("ChloroCure 250mg Capsules", "Chloramphenicol", "antibiotic", "CHLOR-250"),
    ("GentaCure 80mg Injection", "Gentamicin", "antibiotic", "GENTA-80"),
    ("CefaGold 500mg Capsules", "Cefalexin", "antibiotic", "CEFAL-500"),
    ("CefaGold 250mg Capsules", "Cefalexin", "antibiotic", "CEFAL-250"),
    ("AugmentPlus 625mg Tablets", "Amoxicillin/Clavulanate", "antibiotic", "AUGME-625"),
    ("NitroGold 100mg Capsules", "Nitrofurantoin", "antibiotic", "NITRO-100"),
    ("LevoCure 500mg Tablets", "Levofloxacin", "antibiotic", "LEVOF-500"),
    ("MoxiCure 400mg Tablets", "Moxifloxacin", "antibiotic", "MOXIF-400"),
    ("VancoCure 500mg Injection", "Vancomycin", "antibiotic", "VANCO-500"),
    ("LinezoCure 600mg Tablets", "Linezolid", "antibiotic", "LINEZ-600"),
    ("ClindaGold 300mg Capsules", "Clindamycin", "antibiotic", "CLIND-300"),
    ("FusiCure 250mg Tablets", "Fusidic Acid", "antibiotic", "FUSID-250"),
    ("RifampGold 300mg Capsules", "Rifampicin", "antibiotic", "RIFAM-300"),
    ("IsoniaCure 300mg Tablets", "Isoniazid", "antibiotic", "ISION-300"),
    ("StrepoGold 1g Injection", "Streptomycin", "antibiotic", "STREP-1G"),
    ("PyraCure 500mg Tablets", "Pyrazinamide", "antibiotic", "PYRAZ-500"),
    ("EthamGold 400mg Tablets", "Ethambutol", "antibiotic", "ETHAM-400"),
    ("NystaCure 500000IU Tablets", "Nystatin", "antifungal", "NYSTA-500"),
    ("FlucoGold 150mg Capsules", "Fluconazole", "antifungal", "FLUCO-150"),
    ("KetoGold 200mg Tablets", "Ketoconazole", "antifungal", "KETON-200"),
    ("TerbinaCure 250mg Tablets", "Terbinafine", "antifungal", "TERBI-250"),
    ("GriseoGold 500mg Tablets", "Griseofulvin", "antifungal", "GRISE-500"),
    ("ItraCure 100mg Capsules", "Itraconazole", "antifungal", "ITRACON-100"),

    # Malaria Treatments (30)
    ("CoartiPlus 80/480mg Tablets", "Artemether/Lumefantrine", "antimalarial", "COART-80"),
    ("CoartiPlus 20/120mg Tablets", "Artemether/Lumefantrine", "antimalarial", "COART-20"),
    ("ArtemiGold 50mg Tablets", "Artesunate", "antimalarial", "ARTES-50"),
    ("ArtemiGold 200mg Tablets", "Artesunate", "antimalarial", "ARTES-200"),
    ("MalaGone 250mg Tablets", "Chloroquine", "antimalarial", "CHLORO-250"),
    ("QuiniCure 300mg Tablets", "Quinine", "antimalarial", "QUINI-300"),
    ("QuiniCure 600mg Injection", "Quinine", "antimalarial", "QUINI-600"),
    ("MefloGold 250mg Tablets", "Mefloquine", "antimalarial", "MEFLO-250"),
    ("PrimaGold 15mg Tablets", "Primaquine", "antimalarial", "PRIMA-15"),
    ("DoxiMala 100mg Capsules", "Doxycycline", "antimalarial", "DOXYMAL-100"),
    ("PyrimetGold 25mg Tablets", "Pyrimethamine", "antimalarial", "PYRIM-25"),
    ("SP-MalaFix 500/25mg Tablets", "Sulfadoxine/Pyrimethamine", "antimalarial", "SPMALA-500"),
    ("ArtemiCure 40mg Suppository", "Artesunate", "antimalarial", "ARTESUPP-40"),
    ("DihydroGold 40mg Tablets", "Dihydroartemisinin", "antimalarial", "DIHYD-40"),
    ("PipGold 320mg Tablets", "Piperaquine", "antimalarial", "PIPEQ-320"),
    ("AtovaMala 250mg Tablets", "Atovaquone", "antimalarial", "ATOVA-250"),
    ("ProguaCure 100mg Tablets", "Proguanil", "antimalarial", "PROGU-100"),
    ("MalaShield 250/100mg Tabs", "Atovaquone/Proguanil", "antimalarial", "MALASH-250"),
    ("ArteGold IV 60mg Injection", "Artesunate IV", "antimalarial", "ARTEIV-60"),
    ("QuinaGold 200mg Tablets", "Quinidine", "antimalarial", "QUINID-200"),
    ("HalfanCure 250mg Tablets", "Halofantrine", "antimalarial", "HALOF-250"),
    ("LumeGold 120mg Tablets", "Lumefantrine", "antimalarial", "LUMEF-120"),
    ("MalaEnd 50mg Tablets", "Artesunate", "antimalarial", "MALAEND-50"),
    ("FerroMala Syrup 100ml", "Ferroquine", "antimalarial", "FERRO-SYR"),
    ("MalaClear 80mg Tablets", "Artemether", "antimalarial", "MALACL-80"),
    ("PaluStop 200mg Tablets", "Artesunate", "antimalarial", "PALUST-200"),
    ("MalaGuard 250mg Capsules", "Chloroquine", "antimalarial", "MALAG-250"),
    ("QuinaCure Syrup 60ml", "Quinine", "antimalarial", "QUINASYR-60"),
    ("ArteCombo 80mg Tablets", "Artemether", "antimalarial", "ARTEC-80"),
    ("MalaFend 500/25mg Tablets", "Sulfadoxine/Pyrimethamine", "antimalarial", "MALAF-500"),

    # Pain & Fever (30)
    ("ParaGold 500mg Tablets", "Paracetamol", "analgesic", "PARAG-500"),
    ("ParaGold 250mg Syrup 100ml", "Paracetamol", "analgesic", "PARASYP-250"),
    ("IbuCure 400mg Tablets", "Ibuprofen", "analgesic", "IBUCUR-400"),
    ("IbuCure 200mg Tablets", "Ibuprofen", "analgesic", "IBUCUR-200"),
    ("IbuCure Suspension 100ml", "Ibuprofen", "analgesic", "IBUSUS-100"),
    ("AspiGold 300mg Tablets", "Aspirin", "analgesic", "ASPIG-300"),
    ("AspiGold 75mg Tablets", "Aspirin", "analgesic", "ASPIG-75"),
    ("DicloPain 50mg Tablets", "Diclofenac", "analgesic", "DICLO-50"),
    ("DicloPain 75mg Injection", "Diclofenac", "analgesic", "DICLOINJ-75"),
    ("NaproCure 500mg Tablets", "Naproxen", "analgesic", "NAPRO-500"),
    ("IndoGold 25mg Capsules", "Indomethacin", "analgesic", "INDOM-25"),
    ("MefenGold 500mg Tablets", "Mefenamic Acid", "analgesic", "MEFEN-500"),
    ("CeleCure 200mg Capsules", "Celecoxib", "analgesic", "CELEC-200"),
    ("TramaGold 50mg Tablets", "Tramadol", "analgesic", "TRAMA-50"),
    ("TramaGold 100mg SR Tablets", "Tramadol", "analgesic", "TRAMASR-100"),
    ("CodienGold 30mg Tablets", "Codeine", "analgesic", "CODEI-30"),
    ("MorphiCure 10mg Tablets", "Morphine", "analgesic", "MORPH-10"),
    ("PethiCure 50mg Injection", "Pethidine", "analgesic", "PETHI-50"),
    ("ParaCodein 500/30mg Tablets", "Paracetamol/Codeine", "analgesic", "PARACODE-500"),
    ("BruGold 400mg Tablets", "Ibuprofen", "analgesic", "BRUG-400"),
    ("PonCure 500mg Capsules", "Mefenamic Acid", "analgesic", "PONCUR-500"),
    ("VolCure 50mg Tablets", "Diclofenac", "analgesic", "VOLCUR-50"),
    ("FeverEnd 500mg Tablets", "Paracetamol", "analgesic", "FEVER-500"),
    ("PainAway 200mg Capsules", "Ibuprofen", "analgesic", "PAINA-200"),
    ("ThermaGold 500mg Tablets", "Paracetamol", "analgesic", "THERM-500"),
    ("ColdStop Combo Tablets", "Paracetamol/Phenylephrine", "analgesic", "COLDS-COMBO"),
    ("FluEnd Cold Capsules", "Paracetamol/Caffeine", "analgesic", "FLUEN-COLD"),
    ("HeadCure 500mg Tablets", "Paracetamol", "analgesic", "HEADC-500"),
    ("PainShield 400mg Tablets", "Ibuprofen", "analgesic", "PAINSH-400"),
    ("BodyEase 500mg Capsules", "Paracetamol", "analgesic", "BODYE-500"),

    # Vitamins & Supplements (30)
    ("VitaGold Vitamin C 1000mg", "Ascorbic Acid", "vitamin", "VITAC-1000"),
    ("VitaGold Vitamin C 500mg", "Ascorbic Acid", "vitamin", "VITAC-500"),
    ("VitaGold Vitamin B Complex", "B-Complex", "vitamin", "VITAB-COMP"),
    ("VitaGold Vitamin B12 1000mcg", "Cyanocobalamin", "vitamin", "VITAB12"),
    ("VitaGold Vitamin D3 1000IU", "Cholecalciferol", "vitamin", "VITAD3-1000"),
    ("VitaGold Vitamin A 5000IU", "Retinol", "vitamin", "VITAA-5000"),
    ("VitaGold Vitamin E 400IU", "Tocopherol", "vitamin", "VITAE-400"),
    ("VitaGold Folic Acid 5mg", "Folic Acid", "vitamin", "FOLAC-5"),
    ("VitaGold Iron 65mg Tablets", "Ferrous Sulphate", "supplement", "FERRS-65"),
    ("VitaGold Zinc 20mg Tablets", "Zinc Sulphate", "supplement", "ZINCS-20"),
    ("VitaGold Calcium 500mg", "Calcium Carbonate", "supplement", "CALCA-500"),
    ("VitaGold Magnesium 250mg", "Magnesium Oxide", "supplement", "MAGNE-250"),
    ("VitaGold Omega-3 1000mg", "Fish Oil", "supplement", "OMEGA-1000"),
    ("VitaGold Multivitamin Tabs", "Multivitamin", "vitamin", "MULTI-GOLD"),
    ("VitaGold Prenatal Vitamins", "Prenatal Multi", "vitamin", "PRENA-GOLD"),
    ("VitaGold Children's Multi", "Children Multi", "vitamin", "CHILD-MULTI"),
    ("NaturaBoost Moringa Caps", "Moringa", "supplement", "MORING-CAPS"),
    ("NaturaBoost Spirulina 500mg", "Spirulina", "supplement", "SPIRU-500"),
    ("NaturaBoost Turmeric Caps", "Curcumin", "supplement", "TURME-CAPS"),
    ("NaturaBoost Ginger Extract", "Ginger", "supplement", "GINGE-EXTR"),
    ("NaturaBoost Garlic Caps", "Allicin", "supplement", "GARLI-CAPS"),
    ("NaturaBoost Neem Extract", "Neem", "supplement", "NEEM-EXTR"),
    ("NaturaBoost Baobab Powder", "Baobab", "supplement", "BAOBA-POW"),
    ("GrowWell Children Syrup", "Multivitamin Syrup", "vitamin", "GROWW-SYR"),
    ("IronMax 100mg Tablets", "Ferrous Fumerate", "supplement", "IRONM-100"),
    ("CalciMax D3 Tablets", "Calcium/Vit D3", "supplement", "CALCID-MAX"),
    ("ZincBoost 10mg Syrup", "Zinc", "supplement", "ZINCB-SYR"),
    ("FolixGold 400mcg Tablets", "Folic Acid", "vitamin", "FOLIX-400"),
    ("ProbiGold Probiotic Caps", "Lactobacillus", "supplement", "PROBI-CAPS"),
    ("SelenoCure 200mcg Tablets", "Selenium", "supplement", "SELEN-200"),

    # Digestive (20)
    ("AcidStop 20mg Capsules", "Omeprazole", "digestive", "OMEP-20"),
    ("AcidStop 40mg Capsules", "Omeprazole", "digestive", "OMEP-40"),
    ("RaniCure 150mg Tablets", "Ranitidine", "digestive", "RANI-150"),
    ("MetoCure 10mg Tablets", "Metoclopramide", "digestive", "METO-10"),
    ("BuscoGold 10mg Tablets", "Hyoscine", "digestive", "BUSCO-10"),
    ("LoperGold 2mg Capsules", "Loperamide", "digestive", "LOPER-2"),
    ("MaaloGold Antacid Suspension", "Aluminium Hydroxide", "digestive", "MAALO-SUS"),
    ("GasRelief Simethicone 80mg", "Simethicone", "digestive", "GASR-80"),
    ("PanGold Enzyme Tablets", "Pancreatin", "digestive", "PANGE-TABS"),
    ("OralRS Rehydration Sachets", "ORS", "digestive", "ORALRS-SACH"),
    ("ZinCare ORS Plus Zinc", "ORS + Zinc", "digestive", "ZINCARE-ORS"),
    ("SennaCure 7.5mg Tablets", "Senna", "digestive", "SENNA-75"),
    ("LactuGold 3.35g Sachets", "Lactulose", "digestive", "LACTU-3G"),
    ("BismoGold 262mg Tablets", "Bismuth", "digestive", "BISMO-262"),
    ("DomCure 10mg Tablets", "Domperidone", "digestive", "DOMPE-10"),
    ("PriloGold 20mg Tablets", "Lansoprazole", "digestive", "LANSO-20"),
    ("GastroCalm Suspension", "Magnesium Trisilicate", "digestive", "GASTR-SUS"),
    ("FlatEnd 40mg Capsules", "Omeprazole", "digestive", "FLATE-40"),
    ("TummyCare Probiotic", "Lactobacillus/Zinc", "digestive", "TUMMC-PROB"),
    ("ColicEnd Infant Drops", "Simethicone", "digestive", "COLIC-DROP"),

    # Skin & Topical (20)
    ("DermaCure Clotrimazole 1% Cream", "Clotrimazole", "topical", "CLOTRI-CREAM"),
    ("SkinGold Hydrocortisone 1%", "Hydrocortisone", "topical", "HYDRO-CREAM"),
    ("SkinGold Betamethasone Cream", "Betamethasone", "topical", "BETAM-CREAM"),
    ("FungiStop Ketoconazole 2%", "Ketoconazole", "topical", "KETOSHA-2"),
    ("WoundCure Gentian Violet", "Gentian Violet", "topical", "GENTV-SOLN"),
    ("WoundCure Povidone Iodine", "Povidone Iodine", "topical", "POVID-SOLN"),
    ("SkinFresh Zinc Oxide Cream", "Zinc Oxide", "topical", "ZINCO-CREAM"),
    ("SkinGold Calamine Lotion", "Calamine", "topical", "CALAM-LOTN"),
    ("EyeCure Chloramphenicol Drops", "Chloramphenicol", "eye", "CHLOREYE-DROP"),
    ("EyeCure Tetracycline Eye Oint", "Tetracycline", "eye", "TETRAEYE-OINT"),
    ("EarCure Clotrimazole Drops", "Clotrimazole", "ear", "CLOTREAR-DROP"),
    ("AcneCure Benzoyl Peroxide 5%", "Benzoyl Peroxide", "topical", "BENZOY-5"),
    ("ScabCure Permethrin 5% Cream", "Permethrin", "topical", "PERME-5"),
    ("LiceCure Benzyl Benzoate", "Benzyl Benzoate", "topical", "BENZBE-LOTN"),
    ("BurnCure Silver Sulfadiazine", "Silver Sulfadiazine", "topical", "SILVER-CREAM"),
    ("SkinGold Whitfield Ointment", "Benzoic Acid", "topical", "WHITF-OINT"),
    ("NoseCure Xylometazoline Drops", "Xylometazoline", "nasal", "XYLOM-DROP"),
    ("CoughCure Salbutamol Inhaler", "Salbutamol", "respiratory", "SALBU-INH"),
    ("DermaSoft Emollient Cream", "Aqueous Cream", "topical", "DERMA-SOFT"),
    ("SunShield SPF50 Sunscreen", "Titanium Dioxide", "topical", "SUNSH-SPF50"),

    # Recalled / Counterfeit / Banned (30)
    ("FakeCure Paracetamol 500mg", "Paracetamol", "analgesic", "FAKEP-500"),
    ("CounterfeitCoartem 80mg", "Artemether/Lumefantrine", "antimalarial", "CNTFT-COAT"),
    ("UnregHerbal Cough Syrup", "Unknown Herbs", "herbal", "UNRE-COUGH"),
    ("BannedCodeine Syrup 200ml", "Codeine", "cough", "BANED-CODE"),
    ("SubstandardAmox 250mg", "Amoxicillin", "antibiotic", "SUBST-AMOX"),
    ("FakeVitaminC 1000mg", "Ascorbic Acid", "vitamin", "FAKEV-1000"),
    ("UnregDiabetesCure Caps", "Unknown", "herbal", "UNRE-DIAB"),
    ("FakeMalaGone 250mg", "Chloroquine", "antimalarial", "FAKEM-250"),
    ("ContaminatedWater Pack", "Water", "water", "CONTAM-WAT"),
    ("ExpiredAmpiclox 500mg", "Ampicillin/Cloxacillin", "antibiotic", "EXPRD-AMPI"),
    ("UnregSlimmingPills", "Unknown", "supplement", "UNRE-SLIM"),
    ("FakeAugmentin 625mg", "Amoxicillin/Clavulanate", "antibiotic", "FAKEA-625"),
    ("BannedPhenacetin 500mg", "Phenacetin", "analgesic", "BANED-PHEN"),
    ("UnregHepatitisHerbal", "Unknown Herbs", "herbal", "UNRE-HEPA"),
    ("FakeCiprofloxacin 500mg", "Ciprofloxacin", "antibiotic", "FAKEC-500"),
    ("ContaminatedFishOil Caps", "Fish Oil", "supplement", "CONTA-FISH"),
    ("UnregKidneyCleanse", "Unknown", "herbal", "UNRE-KIDN"),
    ("FakeIbuprofen 400mg", "Ibuprofen", "analgesic", "FAKEI-400"),
    ("BannedAnabolicSteroid", "Stanozolol", "steroid", "BANED-STAN"),
    ("UnregMalariaPowder", "Unknown", "herbal", "UNRE-MALA"),
    ("FakeZithromax 500mg", "Azithromycin", "antibiotic", "FAKEZ-500"),
    ("ContaminatedInsulin Vial", "Insulin", "diabetes", "CONTA-INSU"),
    ("UnregWeightLossDrops", "Unknown", "supplement", "UNRE-WGHT"),
    ("FakeORS Sachets", "ORS", "digestive", "FAKEO-ORS"),
    ("BannedMercuryCreamnm", "Mercury", "topical", "BANED-MERC"),
    ("UnregJointPainOil", "Unknown Herbs", "topical", "UNRE-JOIN"),
    ("FakeVitaminD3 1000IU", "Cholecalciferol", "vitamin", "FAKEVD-1000"),
    ("ContaminatedGroundnutOil", "Groundnut Oil", "oil", "CONTA-GOIL"),
    ("UnregHIVHerbalCure", "Unknown", "herbal", "UNRE-HIV"),
    ("FakeOmeprazole 20mg", "Omeprazole", "digestive", "FAKEO-20"),
]

# ── Statuses ──────────────────────────────────────────────────────────────────

def food_status(name):
    n = name.lower()
    if "recalled" in n or "fake" in n or "contaminated" in n or "adulterated" in n:
        return "recalled"
    if "caution" in n or "expired" in n or "unsafe" in n or "sobolo" in n:
        return "under_investigation"
    return "active"

def drug_recall_status(name):
    n = name.lower()
    if any(x in n for x in ["fake", "counterfeit", "banned", "contaminated", "unregistered", "unreg", "expired", "substandard"]):
        return "recalled"
    return "active"

def future_date(days):
    return (date.today() + timedelta(days=days)).isoformat()

def past_date(days):
    return (date.today() - timedelta(days=days)).isoformat()

# ── Main ──────────────────────────────────────────────────────────────────────

print("FoodTrace GH Demo Seeder")
print("=" * 40)

# 1. Register manufacturer
print("\n[1/5] Setting up demo manufacturer...")
mfr_token = register_and_login("FoodTrace Demo Foods", "0200000001", "Demo@1234", "manufacturer")
print("  [OK] Manufacturer logged in")

# 2. Create manufacturer profile
r = post("/manufacturer/profile", {
    "companyName": "FoodTrace Demo Foods Ltd",
    "fdaRegistrationNumber": "FDA-FOOD-DEMO-2024",
    "sector": "food",
    "subscriptionTier": "large"
}, mfr_token)
if r.status_code not in (200, 201, 409):
    print(f"  Profile: {r.status_code} {r.text[:100]}")
print("  [OK] Manufacturer profile ready")

# Demo variety: designate some products RECALLED / EXPIRED so the app shows
# all three safety states. Names are clean brands, so we pick by index.
def demo_state(i):
    if i % 12 == 0:
        return "RECALLED"
    if i % 7 == 0:
        return "EXPIRED"
    return "SAFE"

FARM_ORIGINS = ["Ashanti Region", "Greater Accra", "Eastern Region", "Brong-Ahafo",
                "Northern Region", "Western Region", "Volta Region", "Central Region"]
DRUG_MAKERS = ["Phyto-Riker (GIHOC) Ghana", "Ernest Chemists Ltd", "Tobinco Pharma Ltd",
               "Danadams Pharma", "Kinapharma Ltd", "Entrance Pharma", "M&G Pharma Ghana"]

# 3. Seed food products
print(f"\n[2/5] Seeding {len(FOOD_PRODUCTS)} food products...")
food_qr_codes = []
for i, (name, category) in enumerate(FOOD_PRODUCTS):
    batch_num = f"FD-{1000 + i}"
    state = demo_state(i)
    pkg_date = past_date(random.randint(30, 180))
    # Expired demo products get a past expiry date.
    exp_date = past_date(random.randint(10, 60)) if state == "EXPIRED" else future_date(random.randint(120, 730))

    payload = {
        "batchNumber": batch_num,
        "productName": name,
        "farmOrigin": random.choice(FARM_ORIGINS),
        "packagingDate": pkg_date,
        "expiryDate": exp_date,
        "ingredientSources": [],
        "processingSteps": [],
        "qualityChecks": []
    }
    r = post("/manufacturer/batches", payload, mfr_token)
    if r.status_code in (200, 201):
        data = r.json()
        qr = data.get("qrCode", {}).get("codeString") or f"FT-{batch_num}"
        batch_id = data.get("batch", {}).get("id")
        # Issue a recall for designated recalled products.
        if state == "RECALLED" and batch_id:
            rc = post("/manufacturer/recalls", {
                "batchId": batch_id,
                "reason": "Quality control failure detected during routine FDA inspection.",
                "recallType": "manufacturer",
                "scopeDistricts": []
            }, mfr_token)
            if rc.status_code not in (200, 201):
                state = "SAFE"  # recall failed; reflect actual state
        food_qr_codes.append((name, qr, state))
        if (i + 1) % 50 == 0:
            print(f"  [OK] {i + 1}/{len(FOOD_PRODUCTS)} food products added")
    else:
        print(f"  [ERR] {name}: {r.status_code} {r.text[:80]}")
    time.sleep(0.05)

print(f"  [OK] All food products seeded!")

# 4. Register pharmacist
print("\n[3/5] Setting up demo pharmacist...")
pharm_token = register_and_login("FoodTrace Demo Pharmacy", "0200000002", "Demo@1234", "pharmacist")
print("  [OK] Pharmacist logged in")

# 5. Create pharmacy profile
r = post("/drug/register", {
    "businessName": "FoodTrace Demo Pharmacy",
    "ghanaPharmacyCouncilNumber": "PCGH-DEMO-2024",
    "district": "Accra Central",
    "region": "Greater Accra"
}, pharm_token)
if r.status_code not in (200, 201, 409):
    print(f"  Pharmacy profile: {r.status_code} {r.text[:100]}")
print("  [OK] Pharmacy profile ready")

# 6. Seed drugs
print(f"\n[4/5] Seeding {len(DRUG_PRODUCTS)} drug products...")

def dosage_form(n):
    n = n.lower()
    if "tablet" in n or "tabs" in n: return "tablet"
    if "capsule" in n or "caps" in n: return "capsule"
    if "syrup" in n: return "syrup"
    if "injection" in n or "inj" in n: return "injection"
    if "cream" in n or "ointment" in n: return "cream"
    if "drop" in n: return "drops"
    if "inhaler" in n: return "inhaler"
    if "suppository" in n: return "suppository"
    return "tablet"

drug_qr_codes = []
for i, (name, generic, drug_class, reg_num) in enumerate(DRUG_PRODUCTS):
    state = demo_state(i)

    # Add drug to catalog
    drug_payload = {
        "name": name,
        "genericName": generic,
        "manufacturerName": random.choice(DRUG_MAKERS),
        "drugClass": drug_class,
        "fdaDrugRegistrationNumber": f"FDA-{reg_num}",
        "requiresPrescription": drug_class in ["antibiotic", "antimalarial"],
        "isControlled": any(x in name.lower() for x in ["codeine", "morphi", "pethid", "tramad"]),
        "fdaApprovalStatus": "approved",
        "dosageForm": dosage_form(name),
        "strength": name.split(" ")[1] if len(name.split(" ")) > 1 else "N/A",
        "storageConditions": "Store below 25C in a dry place away from direct sunlight."
    }
    r = post("/drug/drugs", drug_payload, pharm_token)
    drug_id = None
    if r.status_code in (200, 201):
        drug_id = r.json().get("drug", {}).get("id") or r.json().get("id")

    if not drug_id:
        print(f"  [ERR] Drug {name}: {r.status_code} {r.text[:80]}")
        continue

    # Create drug batch (endpoint requires manufactureDate + quantityReceived)
    mfg_date = past_date(random.randint(60, 300))
    exp_date = past_date(random.randint(10, 90)) if state == "EXPIRED" else future_date(random.randint(120, 730))
    qty = random.randint(50, 500)

    batch_payload = {
        "drugId": drug_id,
        "batchNumber": f"DR-{2000 + i}",
        "manufactureDate": mfg_date,
        "expiryDate": exp_date,
        "quantityReceived": qty,
        "quantityRemaining": qty,
        "supplierName": random.choice(DRUG_MAKERS)
    }
    r2 = post("/drug/batches", batch_payload, pharm_token)
    if r2.status_code in (200, 201):
        data = r2.json()
        qr = data.get("qrCode", {}).get("codeString") or f"DR-{2000 + i}"
        batch_id = data.get("batch", {}).get("id")
        # Issue a recall for designated recalled drugs.
        if state == "RECALLED" and batch_id:
            rc = post("/drug/recalls", {
                "batchId": batch_id,
                "reason": "Counterfeit/substandard batch flagged by Ghana Pharmacy Council."
            }, pharm_token)
            if rc.status_code not in (200, 201):
                state = "SAFE"
        drug_qr_codes.append((name, qr, state))
        if (i + 1) % 50 == 0:
            print(f"  [OK] {i + 1}/{len(DRUG_PRODUCTS)} drugs added")
    else:
        print(f"  [ERR] Batch {name}: {r2.status_code} {r2.text[:80]}")
    time.sleep(0.05)

print(f"  [OK] All drug products seeded!")

# ── Write full QR list + print demo highlights ────────────────────────────────
print("\n[5/5] Writing demo QR code list...")

with open("demo_qr_codes.txt", "w", encoding="utf-8") as f:
    f.write("FOODTRACE GH - DEMO QR CODES\n")
    f.write("=" * 50 + "\n\n")
    f.write("FOOD PRODUCTS\n" + "-" * 50 + "\n")
    for name, qr, status in food_qr_codes:
        f.write(f"{qr:28s} [{status:8s}] {name}\n")
    f.write("\nDRUG PRODUCTS\n" + "-" * 50 + "\n")
    for name, qr, status in drug_qr_codes:
        f.write(f"{qr:28s} [{status:8s}] {name}\n")

def highlights(items, state, n):
    return [x for x in items if x[2] == state][:n]

print("\n=== SCAN THESE IN THE APP FOR YOUR DEMO ===")
print("\nFOOD - SAFE:")
for name, qr, _ in highlights(food_qr_codes, "SAFE", 3): print(f"  {qr:28s} {name}")
print("FOOD - RECALLED:")
for name, qr, _ in highlights(food_qr_codes, "RECALLED", 3): print(f"  {qr:28s} {name}")
print("FOOD - EXPIRED:")
for name, qr, _ in highlights(food_qr_codes, "EXPIRED", 3): print(f"  {qr:28s} {name}")
print("\nDRUG - SAFE:")
for name, qr, _ in highlights(drug_qr_codes, "SAFE", 3): print(f"  {qr:28s} {name}")
print("DRUG - RECALLED:")
for name, qr, _ in highlights(drug_qr_codes, "RECALLED", 3): print(f"  {qr:28s} {name}")
print("DRUG - EXPIRED:")
for name, qr, _ in highlights(drug_qr_codes, "EXPIRED", 3): print(f"  {qr:28s} {name}")

fc = {s: sum(1 for x in food_qr_codes if x[2] == s) for s in ("SAFE", "RECALLED", "EXPIRED")}
dc = {s: sum(1 for x in drug_qr_codes if x[2] == s) for s in ("SAFE", "RECALLED", "EXPIRED")}
print("\n[DONE] SEEDING COMPLETE!")
print(f"   Food: {len(food_qr_codes)} (SAFE {fc['SAFE']}, RECALLED {fc['RECALLED']}, EXPIRED {fc['EXPIRED']})")
print(f"   Drugs: {len(drug_qr_codes)} (SAFE {dc['SAFE']}, RECALLED {dc['RECALLED']}, EXPIRED {dc['EXPIRED']})")
print(f"   Total: {len(food_qr_codes) + len(drug_qr_codes)}")
print(f"   Full list saved to: demo_qr_codes.txt")
