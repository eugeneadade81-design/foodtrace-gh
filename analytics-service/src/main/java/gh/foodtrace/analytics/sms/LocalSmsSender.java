package gh.foodtrace.analytics.sms;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Default {@link SmsSender}: instead of calling Africa's Talking it logs the
 * message and keeps it in an in-memory outbox. This lets dev/test runs exercise
 * the full recall-activation flow without SMS credentials or network calls, and
 * lets tests assert what would have been sent.
 *
 * <p>Active unless {@code sms.africastalking.enabled=true}, in which case
 * {@link AfricasTalkingSmsSender} takes over.
 */
@Component
@ConditionalOnProperty(name = "sms.africastalking.enabled", havingValue = "false", matchIfMissing = true)
public class LocalSmsSender implements SmsSender {

    private static final Logger log = LoggerFactory.getLogger(LocalSmsSender.class);

    /** A message that would have been sent. */
    public record Sent(List<String> recipients, String message) {
    }

    private final List<Sent> outbox = new CopyOnWriteArrayList<>();

    @Override
    public int send(List<String> recipients, String message) {
        outbox.add(new Sent(List.copyOf(recipients), message));
        log.info("[LocalSmsSender] would send to {}: {}", recipients, message);
        return recipients.size();
    }

    /** All messages captured so far (read-only). */
    public List<Sent> outbox() {
        return List.copyOf(outbox);
    }

    public void clear() {
        outbox.clear();
    }
}
