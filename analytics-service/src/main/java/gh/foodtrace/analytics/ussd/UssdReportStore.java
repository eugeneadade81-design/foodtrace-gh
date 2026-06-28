package gh.foodtrace.analytics.ussd;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Holds unsafe-food reports submitted via the USSD menu. Kept in memory for now
 * (Role 5-owned data, not part of Role 1's schema) so the demo works without a
 * new table; can be swapped for a JPA repository later without touching callers.
 */
@Component
public class UssdReportStore {

    /** A single citizen report captured over USSD. */
    public record Report(long ref, String phoneNumber, String description) {
    }

    private final AtomicLong sequence = new AtomicLong(1000);
    private final List<Report> reports = new CopyOnWriteArrayList<>();

    /** Stores a report and returns its reference number. */
    public long add(String phoneNumber, String description) {
        long ref = sequence.incrementAndGet();
        reports.add(new Report(ref, phoneNumber, description));
        return ref;
    }

    public List<Report> all() {
        return List.copyOf(reports);
    }
}
