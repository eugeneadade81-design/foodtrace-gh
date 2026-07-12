package gh.foodtrace.analytics.ussd;

import gh.foodtrace.analytics.domain.Batch;
import gh.foodtrace.analytics.domain.Farm;
import gh.foodtrace.analytics.domain.Recall;
import gh.foodtrace.analytics.repo.BatchRepository;
import gh.foodtrace.analytics.repo.FarmRepository;
import gh.foodtrace.analytics.repo.RecallRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Drives the *714*FOOD# USSD menu. Africa's Talking sends the full accumulated
 * input as {@code text}, with each step joined by '*'. This service is a small
 * state machine over that string and returns a {@link UssdResponse} body.
 *
 * <pre>
 *   ""        -> main menu
 *   "1"       -> ask for batch code
 *   "1*CODE"  -> verify batch CODE
 *   "2"       -> ask for problem description
 *   "2*TEXT"  -> store report, acknowledge
 *   "3"       -> list active recalls
 * </pre>
 */
@Service
public class UssdMenuService {

    private static final String STATUS_ACTIVE = "ACTIVE";

    private final BatchRepository batches;
    private final FarmRepository farms;
    private final RecallRepository recalls;
    private final UssdReportStore reports;

    public UssdMenuService(BatchRepository batches, FarmRepository farms,
                           RecallRepository recalls, UssdReportStore reports) {
        this.batches = batches;
        this.farms = farms;
        this.recalls = recalls;
        this.reports = reports;
    }

    public String handle(String phoneNumber, String text) {
        String input = text == null ? "" : text.trim();

        if (input.isEmpty()) {
            return mainMenu();
        }

        String[] parts = input.split("\\*");
        String choice = parts[0];

        return switch (choice) {
            case "1" -> parts.length < 2 ? UssdResponse.con("Enter batch code:")
                                         : verifyBatch(parts[1]);
            case "2" -> parts.length < 2 ? UssdResponse.con("Describe the unsafe food issue:")
                                         : storeReport(phoneNumber, parts[1]);
            case "3" -> activeRecalls();
            default  -> UssdResponse.end("Invalid choice. Please dial again.");
        };
    }

    private String mainMenu() {
        return UssdResponse.con("""
                FoodTrace GH
                1. Verify a batch
                2. Report unsafe food
                3. Active recalls""");
    }

    private String verifyBatch(String rawCode) {
        String code = rawCode == null ? "" : rawCode.trim();
        if (code.isEmpty()) {
            return UssdResponse.end("No batch code entered.");
        }
        Optional<Batch> found = batches.findByBatchCodeIgnoreCase(code);
        if (found.isEmpty()) {
            return UssdResponse.end("Batch " + code + " not found.");
        }
        Batch b = found.get();
        String farmName = farms.findById(b.getFarmId()).map(Farm::getName).orElse("Unknown farm");
        return UssdResponse.end(
                b.getBatchCode() + ": " + b.getProductName()
                        + "\nStatus: " + b.getStatus()
                        + "\nFarm: " + farmName);
    }

    private String storeReport(String phoneNumber, String description) {
        String desc = description == null ? "" : description.trim();
        if (desc.isEmpty()) {
            return UssdResponse.end("No description entered.");
        }
        long ref = reports.add(phoneNumber, desc);
        return UssdResponse.end("Report received. Thank you.\nReference: " + ref);
    }

    private String activeRecalls() {
        List<Recall> active = recalls.findByStatus(STATUS_ACTIVE);
        if (active.isEmpty()) {
            return UssdResponse.end("No active recalls. Food supply is clear.");
        }
        StringBuilder sb = new StringBuilder("Active recalls:");
        for (Recall r : active) {
            sb.append("\n- ").append(r.getRecallCode())
              .append(" (").append(r.getSeverity()).append(", ").append(r.getRegion()).append(")");
        }
        return UssdResponse.end(sb.toString());
    }
}
