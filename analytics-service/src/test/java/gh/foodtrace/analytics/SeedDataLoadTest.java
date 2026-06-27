package gh.foodtrace.analytics;

import gh.foodtrace.analytics.repo.BatchRepository;
import gh.foodtrace.analytics.repo.FarmRepository;
import gh.foodtrace.analytics.repo.InputLogRepository;
import gh.foodtrace.analytics.repo.RecallRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Boots the full Spring context, which runs schema.sql then data.sql against the
 * in-memory H2 database. Asserting the seed counts proves both files are valid,
 * the foreign-key insert ordering holds, and the read-model entities map cleanly.
 */
@SpringBootTest
class SeedDataLoadTest {

    @Autowired
    private FarmRepository farms;
    @Autowired
    private BatchRepository batches;
    @Autowired
    private RecallRepository recalls;
    @Autowired
    private InputLogRepository inputLogs;

    @Test
    void seedDataLoadsWithExpectedCounts() {
        assertThat(farms.count()).isEqualTo(10);
        assertThat(batches.count()).isEqualTo(30);
        assertThat(recalls.count()).isEqualTo(5);
        assertThat(inputLogs.count()).isEqualTo(16);
    }

    @Test
    void complianceFlagsAreSurfaced() {
        // ids 7, 9, 11, 13 in data.sql were seeded with approved = FALSE.
        assertThat(inputLogs.findByApprovedFalse()).hasSize(4);
    }
}
