package com.foodtrace.api.controller;

import com.foodtrace.api.security.CurrentUser;
import com.foodtrace.api.service.ManufacturerService;
import com.foodtrace.api.service.RegulatorService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CompatibilityControllers {

  @RestController
  @RequestMapping("/api/manufacturer")
  static class ManufacturerController {
    private final ManufacturerService manufacturerService;

    ManufacturerController(ManufacturerService manufacturerService) {
      this.manufacturerService = manufacturerService;
    }

    @GetMapping("/dashboard")
    Map<String, Object> dashboard(Authentication authentication) {
      return manufacturerService.dashboard(currentUser(authentication));
    }

    @PostMapping("/profile")
    @ResponseStatus(HttpStatus.CREATED)
    Map<String, Object> createProfile(@RequestBody Map<String, Object> body, Authentication authentication) {
      return manufacturerService.createProfile(currentUser(authentication), body);
    }

    @PostMapping("/batches")
    @ResponseStatus(HttpStatus.CREATED)
    Map<String, Object> createBatch(@RequestBody Map<String, Object> body, Authentication authentication) {
      return manufacturerService.createBatch(currentUser(authentication), body);
    }

    @PostMapping("/recalls")
    @ResponseStatus(HttpStatus.CREATED)
    Map<String, Object> createRecall(@RequestBody Map<String, Object> body, Authentication authentication) {
      return manufacturerService.createRecall(currentUser(authentication), body);
    }

    private CurrentUser currentUser(Authentication auth) {
      return (CurrentUser) auth.getPrincipal();
    }
  }

  @RestController
  @RequestMapping("/api/regulator")
  static class RegulatorController {
    private final RegulatorService regulatorService;

    RegulatorController(RegulatorService regulatorService) {
      this.regulatorService = regulatorService;
    }

    @GetMapping("/dashboard")
    Map<String, Object> dashboard() {
      return regulatorService.dashboard();
    }

    @PatchMapping("/reports")
    Map<String, Object> reviewReport(@RequestBody Map<String, Object> body) {
      return regulatorService.reviewReport(body);
    }

    @PostMapping("/recalls")
    @ResponseStatus(HttpStatus.CREATED)
    Map<String, Object> createRecall(@RequestBody Map<String, Object> body, Authentication authentication) {
      return regulatorService.createRecall(currentUser(authentication), body);
    }

    private CurrentUser currentUser(Authentication auth) {
      return (CurrentUser) auth.getPrincipal();
    }
  }

  @RestController
  @RequestMapping("/api/assistant")
  static class AssistantController {
    private static final HttpClient HTTP = HttpClient.newHttpClient();
    private static final java.util.Random RNG = new java.util.Random();

    private static final String SYSTEM_PROMPT =
        "You are FoodTrace GH Assistant — an expert AI on food safety, drug safety, and public health for Ghana. "
        + "You have deep knowledge of:\n"
        + "- Ghana Food and Drugs Authority (FDA Ghana) regulations and approved product standards\n"
        + "- Common Ghanaian foods: waakye, kenkey, banku, fufu, jollof rice, kelewele, kontomire, garden eggs, "
        + "  palm nut soup, groundnut soup, light soup, tilapia, smoked fish, shito, and local street foods\n"
        + "- Common medicines available in Ghana: paracetamol, amoxicillin, metronidazole, chloroquine, "
        + "  artesunate, ORS, vitamins, and counterfeit drug risks\n"
        + "- Food storage in Ghana's tropical climate (heat, humidity, rainy season effects)\n"
        + "- Food poisoning symptoms, prevention, and when to seek help\n"
        + "- Market food safety: chop bars, street food, open markets\n"
        + "- Pesticide and chemical safety on Ghanaian farms\n"
        + "- Safe drinking water: sachet water, borehole, treated water\n"
        + "- Proper meat, fish, and poultry handling in warm climates\n"
        + "- Baby and infant feeding safety\n"
        + "- Herbal and traditional medicine safety\n"
        + "- How to use FoodTrace GH: scanning QR codes, checking recalls, reporting concerns\n\n"
        + "Rules:\n"
        + "- Always give practical, actionable advice suited to Ghana\n"
        + "- If someone says they feel sick, advise them to seek medical help promptly\n"
        + "- Never diagnose medical conditions\n"
        + "- Keep responses under 180 words — clear and direct\n"
        + "- If asked about a specific product scanned on FoodTrace, help interpret the result\n"
        + "- Be warm and friendly, like a knowledgeable health worker from the community";

    private final ObjectMapper mapper;

    AssistantController(ObjectMapper mapper) {
      this.mapper = mapper;
    }

    @GetMapping
    Map<String, Object> get() {
      String key = System.getenv("ANTHROPIC_API_KEY");
      return Map.of("status", key != null && !key.isBlank() ? "ready" : "not_configured");
    }

    @SuppressWarnings("unchecked")
    @PostMapping("/chat")
    Map<String, Object> chat(@RequestBody Map<String, Object> body) {
      String message = String.valueOf(body.getOrDefault("message", "")).trim();
      if (message.isBlank()) return Map.of("reply", "Please ask a question.");
      String key = System.getenv("ANTHROPIC_API_KEY");
      if (key == null || key.isBlank()) return Map.of("reply", fallback(message));
      try {
        // Support conversation history for context-aware responses
        java.util.List<Map<String, Object>> history = new java.util.ArrayList<>();
        Object rawHistory = body.get("history");
        if (rawHistory instanceof java.util.List<?> list) {
          for (Object item : list) {
            if (item instanceof Map<?, ?> m) {
              String role = String.valueOf(m.get("role"));
              String content = String.valueOf(m.get("content"));
              if (!role.isBlank() && !content.isBlank()) {
                history.add(Map.of("role", role, "content", content));
              }
            }
          }
        }
        history.add(Map.of("role", "user", "content", message));
        return Map.of("reply", callClaude(key, history));
      } catch (Exception e) {
        return Map.of("reply", fallback(message));
      }
    }

    @PostMapping("/query")
    Map<String, Object> query(@RequestBody Map<String, Object> body) {
      return chat(body);
    }

    private String callClaude(String apiKey, java.util.List<Map<String, Object>> messages) throws Exception {
      String payload = mapper.writeValueAsString(Map.of(
          "model", "claude-haiku-4-5-20251001",
          "max_tokens", 700,
          "system", SYSTEM_PROMPT,
          "messages", messages
      ));
      HttpRequest req = HttpRequest.newBuilder()
          .uri(URI.create("https://api.anthropic.com/v1/messages"))
          .header("Content-Type", "application/json")
          .header("x-api-key", apiKey)
          .header("anthropic-version", "2023-06-01")
          .POST(HttpRequest.BodyPublishers.ofString(payload))
          .build();
      HttpResponse<String> res = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
      if (res.statusCode() != 200) {
        throw new RuntimeException("Anthropic error " + res.statusCode() + ": " + res.body());
      }
      JsonNode root = mapper.readTree(res.body());
      String text = root.path("content").path(0).path("text").asText("");
      if (text.isBlank()) throw new RuntimeException("Empty response from Anthropic");
      return text;
    }

    // ── Offline fallback — broad topic coverage, varied answers ───────────────

    private String fallback(String message) {
      String q = message.toLowerCase();

      // Greetings
      if (q.matches(".*(hello|hi|hey|good morning|good afternoon|good evening|how are you).*")) {
        return pick(
            "Hello! I'm your FoodTrace GH food and drug safety assistant. Ask me anything about food safety, medicine storage, expiry dates, recalls, or how to use the app.",
            "Hi there! I'm here to help you stay safe with food and medicines in Ghana. What would you like to know?",
            "Good day! Ask me about any food or medicine safety concern and I'll do my best to help you."
        );
      }

      // Expiry / shelf life / best before
      if (q.matches(".*(expir|best before|shelf life|use by|out of date|gone bad|stale).*")) {
        return pick(
            "Never consume food or medicine past its expiry date, even if it looks or smells fine. Some harmful bacteria produce no visible signs. Scan the QR code on FoodTrace to check the registered expiry date for that batch.",
            "The expiry date is the last day a product is guaranteed to be safe and effective. For medicines, expired drugs may lose potency or become harmful. For food, discard anything past its date — it's not worth the risk.",
            "Expiry dates exist for safety reasons. In Ghana's hot and humid climate, food can spoil even faster than the date suggests if not stored correctly. Always check the date AND the storage condition of the product."
        );
      }

      // Recalls / unsafe / contaminated / banned
      if (q.matches(".*(recall|unsafe|dangerous|contaminat|spoil|ban|withdraw|hazard|poison).*")) {
        return pick(
            "If a product is recalled, stop using it immediately. Do not give it to others. Return it to the seller or dispose of it safely. Report it using the FoodTrace app. If you've already consumed it and feel unwell, visit a clinic or hospital right away.",
            "Recalls happen when a product is found to be unsafe — contaminated, mislabelled, or containing harmful substances. FoodTrace checks for active recalls every time you scan a QR code. A red screen means the product is recalled — do not use it.",
            "A recalled product can cause serious harm. FDA Ghana issues recalls when safety tests fail. Use FoodTrace to check any product before consuming. You can also report suspicious products through the app's Report feature."
        );
      }

      // Food storage
      if (q.matches(".*(store|storage|keep|fridge|freezer|refrigerat|room temp|preserve|last long).*") && !q.contains("medicine") && !q.contains("drug") && !q.contains("tablet")) {
        return pick(
            "In Ghana's warm climate, food spoils faster than in cooler countries. Cooked food left at room temperature for more than 2 hours should be discarded. Use airtight containers, refrigerate perishables, and keep raw meat separate from other foods.",
            "For fruits and vegetables: store them in a cool, dry place or the fridge. For cooked stews like groundnut soup or light soup, refrigerate within 2 hours and reheat thoroughly before eating. Do not leave food uncovered — insects carry bacteria.",
            "Dried and packaged foods like gari, rice, and flour should be kept in sealed containers away from moisture and pests. Once opened, use quickly. Check for signs of mould, unusual smell, or discolouration before cooking."
        );
      }

      // Medicine / drug storage
      if (q.matches(".*(medicine|drug|tablet|capsule|syrup|store|storage|keep).*(medicine|drug|tablet|capsule|syrup|keep|cool|hot).*") || (q.matches(".*(store|storage|keep).*") && q.matches(".*(medicine|drug|tablet|capsule|syrup|pill).*"))) {
        return pick(
            "Most medicines should be stored in a cool, dry place below 25°C and away from direct sunlight. Ghana's heat can degrade medicines faster. Never store tablets in the bathroom — the humidity ruins them. Keep all medicines out of reach of children.",
            "Liquid medicines like syrups and suspensions often need refrigeration after opening — check the label. Tablets and capsules generally do not need refrigeration unless stated. Medicines left in hot cars or direct sun can lose effectiveness quickly.",
            "Store medicines in their original packaging so you can always see the expiry date and dosage instructions. Never mix different medicines in one container. If a medicine changes colour, smell, or texture, do not use it — it may have degraded."
        );
      }

      // Food poisoning / sick / vomit / diarrhoea
      if (q.matches(".*(food poison|stomach|sick|vomit|nausea|diarrh|purge|running stomach|cramp|ache|unwell|fever after eating).*")) {
        return pick(
            "If you suspect food poisoning, drink plenty of clean water or oral rehydration solution (ORS) to stay hydrated. If symptoms are severe — high fever, bloody stool, or you cannot keep fluids down — go to a clinic or hospital immediately. Do not delay.",
            "Common signs of food poisoning are stomach cramps, nausea, vomiting, and diarrhoea, usually within hours of eating bad food. Mild cases can be managed at home with ORS and rest. But if symptoms last more than 24 hours or get worse, seek medical help.",
            "Food poisoning in Ghana is often linked to improperly stored cooked food, contaminated water, or unwashed produce. If you ate street food or market food and feel ill shortly after, visit a health centre. Remember to report the food source if you can."
        );
      }

      // Scanning / QR / how to use app
      if (q.matches(".*(scan|qr|how|use app|barcode|camera|result|check product).*")) {
        return pick(
            "To scan a product: open the app, tap the Scan tab at the bottom, and point your camera at the QR code on the packaging. FoodTrace will show green (safe), yellow (caution), or red (recalled) along with the full product details and a spoken safety summary.",
            "You can also type or paste a batch code manually in the Scanner screen if the camera can't read the QR code. Sample codes to try: FT-QR-1001 for food and DR-QR-1001 for medicine. Results are from the FDA-registered database.",
            "After scanning, you'll see the product name, batch number, expiry date, manufacturer, and safety status. The app speaks the result aloud in English or Twi. If you want more details, tap 'Ask AI about this product' to get my help interpreting the result."
        );
      }

      // Meat / fish / poultry
      if (q.matches(".*(meat|fish|chicken|beef|pork|mutton|goat|tilapia|tuna|sardine|smoked fish|fresh fish|raw meat|blood).*")) {
        return pick(
            "Fresh meat and fish spoil quickly in Ghana's heat. Buy only what you can refrigerate or cook immediately. Raw meat should be stored on the lowest shelf of the fridge to prevent juices dripping onto other foods. Cook meat thoroughly — no pink in the middle.",
            "Smoked fish (koobi, momone, herrings) should be kept dry and away from moisture. Once moisture gets in, mould grows quickly. Fresh tilapia and other fish should be cooked the same day you buy them if not refrigerated. Trust your nose — bad fish smells very strong.",
            "Chicken sold at markets should be bought fresh and refrigerated immediately. Never leave raw poultry at room temperature for more than 1 hour in Ghana's climate. Salmonella from undercooked chicken is a common cause of food poisoning."
        );
      }

      // Street food / chop bar / market food
      if (q.matches(".*(street food|chop bar|waakye|kenkey|banku|fufu|jollof|kelewele|market food|bofrot|koose|tuo zaafi|fried rice|vendor).*")) {
        return pick(
            "Street food in Ghana can be safe or risky depending on how it's prepared and stored. Choose vendors whose food is freshly cooked and kept covered. Avoid pre-cooked food that has been sitting out for hours, especially rice dishes and stews.",
            "When eating waakye, kenkey, or banku from a chop bar, check that the stew and protein look freshly made. Oils that smell rancid or food that tastes sour or \"off\" should be avoided. Your gut feeling is a good guide — if something tastes wrong, stop eating.",
            "Busy street food vendors are often safer than quiet ones because their food sells fast and is replaced frequently. Avoid vendors who handle food and money with the same unwashed hands. A good sign is when the vendor uses gloves or a spoon, not bare hands."
        );
      }

      // Fruits and vegetables / pesticides
      if (q.matches(".*(fruit|vegetable|tomato|pepper|onion|plantain|yam|cassava|garden egg|kontomire|leafy|wash|peel|pesticide|spray|chemical|organic).*")) {
        return pick(
            "Always wash fruits and vegetables thoroughly under clean running water before eating or cooking, even if you plan to peel them. Bacteria from the skin can transfer to the flesh when cutting. A mild salt-water soak for 10 minutes helps remove surface residues.",
            "Pesticide residues on produce are a real concern in Ghana. Washing well reduces risk but doesn't remove all chemicals. Where possible, peel fruits like mangoes and tomatoes. Buy from certified vendors when available, or look for FoodTrace QR codes on packaged produce.",
            "Leafy vegetables like kontomire and lettuce can harbour bacteria and parasites if grown with contaminated water. Wash every leaf individually and cook thoroughly. If eating raw in a salad, use bottled or boiled water to rinse."
        );
      }

      // Water / drinking water safety
      if (q.matches(".*(water|drink|sachet|borehole|tap water|pure water|bottled|clean water|boil water|contaminate water).*")) {
        return pick(
            "In Ghana, sachet water (pure water) from reputable brands is generally safe to drink. Avoid sachets that are torn, discoloured, or have no visible brand name — these may be counterfeit or unfiltered. Borehole water should be tested before drinking regularly.",
            "Tap water in most Ghanaian cities is treated by GWCL but can pick up contamination through old pipes. If unsure, boil tap water for at least 1 minute before drinking or use a certified filter. Always use clean water for washing vegetables and making baby formula.",
            "Contaminated water is one of the biggest causes of diarrhoea and cholera in Ghana. If there's an outbreak in your area, boil all drinking water even if it looks clear. Cholera bacteria are invisible to the naked eye but destroyed by boiling."
        );
      }

      // Baby / infant feeding
      if (q.matches(".*(baby|infant|child|toddler|formula|breast milk|complementary|weaning|porridge|koko|tom brown).*")) {
        return pick(
            "Breast milk is the safest food for babies under 6 months — it provides immunity and is always at the right temperature. If using infant formula, always mix with boiled, cooled water and use within 1 hour. Never reuse leftover formula.",
            "Baby food like koko (fermented porridge) should be freshly made and given immediately. Leftover koko should not be stored and reheated — bacteria grow very fast in warm porridge. Ensure all utensils used for baby food are sterilised or thoroughly washed.",
            "Weaning foods should be freshly prepared, soft, and age-appropriate. Avoid giving babies processed snacks, very salty food, or sugary drinks. If your baby develops diarrhoea after introducing a new food, stop that food and consult a health worker."
        );
      }

      // Counterfeit / fake medicines
      if (q.matches(".*(counterfeit|fake|original|genuine|authentic|substandard|fake drug|real medicine).*")) {
        return pick(
            "Counterfeit medicines are a serious problem in Ghana. They may contain no active ingredient, the wrong ingredient, or harmful substances. Buy medicines only from licensed pharmacies with Ghana Pharmacy Council registration. Use FoodTrace to scan drug QR codes and verify authenticity.",
            "Signs of a counterfeit medicine include: unusual colour or smell, packaging with spelling errors, prices that seem too good to be true, and no batch number or expiry date. If you suspect a medicine is fake, report it to FDA Ghana immediately and do not take it.",
            "To protect yourself from fake drugs: buy only from registered pharmacies, ask for a receipt, check the batch number on the packaging matches what's inside, and scan the QR code on FoodTrace. Roadside medicine sellers are not regulated and often sell substandard products."
        );
      }

      // Herbal / traditional medicine
      if (q.matches(".*(herbal|traditional|roots|bark|natural remedy|local medicine|bitters|akpeteshie|local gin|sobolo|moringa).*")) {
        return pick(
            "Traditional and herbal medicines are widely used in Ghana and some have real health benefits. However, they are not all safe. Some herbal preparations can interact with prescription medicines, damage the liver, or contain heavy metals. Always inform your doctor if you're taking herbal remedies.",
            "FDA Ghana regulates herbal medicines — look for the FDA approval stamp on the packaging before buying. Unlicensed herbal products have no quality control, meaning the dose and ingredients can vary unpredictably. Moringa, sobolo (hibiscus), and ginger teas in moderate amounts are generally safe.",
            "Never replace prescribed medicines with herbal remedies without consulting a doctor, especially for serious conditions like diabetes, hypertension, or infections. Some patients have been harmed by stopping proven treatments in favour of unverified traditional cures."
        );
      }

      // FDA Ghana / regulations / approval
      if (q.matches(".*(fda|food and drug|regulator|approved|license|certif|authority|standard|inspection).*")) {
        return pick(
            "The Food and Drugs Authority (FDA Ghana) is responsible for regulating food, medicines, cosmetics, and medical devices in Ghana. They approve products, conduct inspections, and issue recalls when safety issues are found. You can report unsafe products to FDA Ghana directly or through FoodTrace.",
            "FDA Ghana approval means a product has been tested and meets safety, quality, and efficacy standards. Always look for the FDA Ghana stamp on food and medicine packaging. Products without it may be counterfeit or imported illegally without safety checks.",
            "FoodTrace GH works alongside FDA Ghana to give consumers real-time access to product safety data. When a regulator issues a recall on FoodTrace, any consumer who scans that product's QR code will immediately see a red RECALLED screen and be warned not to use it."
        );
      }

      // Paracetamol / common medicines
      if (q.matches(".*(paracetamol|ibuprofen|aspirin|antibiotic|amoxicillin|metronidazole|malaria|artesunate|chloroquine|ors|rehydration|vitamin).*")) {
        return pick(
            "Paracetamol is safe for fever and mild pain when taken at the correct dose — 500mg to 1g for adults, every 4-6 hours, maximum 4g per day. Overdose can cause serious liver damage. Never take more than the recommended amount, even if pain persists.",
            "Antibiotics like amoxicillin and metronidazole must be prescribed by a doctor and the full course completed — even if you feel better. Stopping early allows bacteria to survive and become resistant, making the infection harder to treat next time.",
            "For malaria treatment in Ghana, use WHO-approved artemisinin-based combination therapy (ACT) like artesunate-amodiaquine. Do not self-medicate with chloroquine alone — resistance is widespread. Always test before treating if possible, and see a qualified health worker."
        );
      }

      // Cooking / temperature / raw food
      if (q.matches(".*(cook|temperature|raw|undercook|overcook|heat|boil|fry|grill|microwave|reheat).*")) {
        return pick(
            "Cooking food to the right temperature kills harmful bacteria. Meat and poultry should be cooked until juices run clear with no pink inside. Fish should flake easily when done. When reheating food, make sure it's steaming hot all the way through — not just warm on the outside.",
            "Raw foods like salads and fruits carry higher contamination risk in Ghana. If eating raw, wash thoroughly with clean water and peel where possible. Be especially careful with raw meat — never let it touch ready-to-eat foods and wash hands, knives, and boards after handling it.",
            "Frying in palm oil or vegetable oil is common in Ghana. Repeatedly reused oil becomes oxidised and can produce harmful compounds. Change frying oil regularly — if it's very dark, foamy, or smells burnt, discard it. Fresh oil produces safer, better-tasting food."
        );
      }

      // Palm oil / cooking oil
      if (q.matches(".*(palm oil|vegetable oil|coconut oil|oil|frying oil|rancid|cooking oil).*")) {
        return pick(
            "Palm oil is a staple in Ghanaian cooking and a good source of vitamins A and E when used fresh and unrefined. However, overheating palm oil repeatedly makes it rancid and potentially harmful. Store oil in a sealed container away from light and heat.",
            "Rancid oil tastes bitter and smells unpleasant. Consuming rancid oil regularly has been linked to inflammation and digestive issues. If your oil has changed colour significantly or smells off, discard it. Fresh, good-quality palm oil should have a bright orange-red colour.",
            "When buying packaged cooking oil, check the expiry date and look for FDA Ghana approval. Avoid very cheap unbranded oils sold in open containers at markets — these may be adulterated or rancid. FoodTrace QR codes on packaged oils let you verify the product batch."
        );
      }

      // Default — help menu
      return pick(
          "I'm the FoodTrace GH food and drug safety assistant. I can help you with: checking expiry dates, understanding recall alerts, safe food storage in Ghana's climate, food poisoning symptoms, medicine safety, street food risks, clean water, baby feeding, herbal medicine, and how to use the FoodTrace app. What would you like to know?",
          "Ask me anything about food or medicine safety in Ghana. For example: 'How do I store fish overnight?', 'What do I do if a product is recalled?', 'Is it safe to take expired paracetamol?', or 'How do I scan a QR code?' I'm here to help.",
          "I'm your FoodTrace GH health assistant. I know about Ghanaian foods, common medicines, FDA Ghana regulations, food poisoning, storage tips for Ghana's hot climate, and counterfeit drug risks. Type your question and I'll give you a straight answer."
      );
    }

    private String pick(String... options) {
      return options[RNG.nextInt(options.length)];
    }
  }

  @RestController
  @RequestMapping("/api/audio")
  static class AudioController {
    @PostMapping("/speech")
    Map<String, Object> speech(@RequestBody Map<String, Object> body) {
      return Map.of("status", "not_configured",
          "message", "Google Cloud TTS is not configured. Set GOOGLE_APPLICATION_CREDENTIALS and GOOGLE_CLOUD_PROJECT to enable audio summaries.");
    }
  }

  @RestController
  @RequestMapping("/api/sms")
  static class SmsController {
    @PostMapping("/callback")
    Map<String, Object> callback(@RequestBody Map<String, Object> body) {
      // Accepts Africa's Talking SMS callbacks; actual delivery not yet implemented
      return Map.of("status", "not_configured",
          "message", "SMS delivery not configured. Set AFRICASTALKING_API_KEY to enable.");
    }
  }

  @RestController
  @RequestMapping("/api/ussd")
  static class UssdController {
    @PostMapping("/callback")
    Map<String, Object> callback(@RequestBody Map<String, Object> body) {
      // Accepts Africa's Talking USSD callbacks; actual menu logic not yet implemented
      return Map.of("response", "END FoodTrace USSD is not yet configured.", "status", "not_configured");
    }
  }
}
