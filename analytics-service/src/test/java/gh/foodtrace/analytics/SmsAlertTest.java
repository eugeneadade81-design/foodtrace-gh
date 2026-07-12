package gh.foodtrace.analytics;

import gh.foodtrace.analytics.service.RecallService;
import gh.foodtrace.analytics.sms.LocalSmsSender;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies that activating a recall fires an SMS to the affected farmer via the
 * local (stub) sender, and that non-activation transitions stay silent.
 *
 * Seed facts: recall 5 (DRAFT) -> batch 18 -> farm 6 (Cape Coast Shore Fisheries,
 * +233241000006). Recall 3 is already ACTIVE; recall 1 is RESOLVED.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SmsAlertTest {

    @Autowired
    private RecallService recalls;
    @Autowired
    private LocalSmsSender sms;

    @BeforeEach
    void clearOutbox() {
        sms.clear();
    }

    @Test
    void activatingDraftRecallTextsTheAffectedFarmer() {
        recalls.updateStatus(5L, "ACTIVE");

        assertThat(sms.outbox()).hasSize(1);
        LocalSmsSender.Sent sent = sms.outbox().get(0);
        assertThat(sent.recipients()).containsExactly("+233241000006");
        assertThat(sent.message()).contains("RCL-2026-005").contains("Action required");
    }

    @Test
    void reactivatingAnAlreadyActiveRecallDoesNotResend() {
        recalls.updateStatus(3L, "ACTIVE"); // recall 3 is already ACTIVE in seed
        assertThat(sms.outbox()).isEmpty();
    }

    @Test
    void resolvingARecallDoesNotSendSms() {
        recalls.updateStatus(1L, "RESOLVED");
        assertThat(sms.outbox()).isEmpty();
    }
}
