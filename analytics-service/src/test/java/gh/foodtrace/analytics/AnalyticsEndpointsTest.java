package gh.foodtrace.analytics;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Exercises the analytics endpoints against the seeded H2 data, proving the full
 * controller -> service -> repository -> SQL wiring. Expected numbers come from
 * data.sql: 30 batches, 10 farms, 5 recalls (2 ACTIVE: ids 3 & 4), 4 unapproved
 * input logs, and 6 distinct batch statuses.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AnalyticsEndpointsTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void summaryReturnsSeededKpis() throws Exception {
        mvc.perform(get("/api/analytics/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalBatches").value(30))
                .andExpect(jsonPath("$.totalFarms").value(10))
                .andExpect(jsonPath("$.totalRecalls").value(5))
                .andExpect(jsonPath("$.activeRecalls").value(2))
                .andExpect(jsonPath("$.complianceFlags").value(4));
    }

    @Test
    void batchesByStatusReturnsAllSixBuckets() throws Exception {
        mvc.perform(get("/api/analytics/batches-by-status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(6));
    }

    @Test
    void recallsByMonthReturnsLabelledPoints() throws Exception {
        mvc.perform(get("/api/analytics/recalls-by-month"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].label").exists())
                .andExpect(jsonPath("$[0].count").exists());
    }

    @Test
    void farmsByRegionReturnsSlices() throws Exception {
        mvc.perform(get("/api/analytics/farms-by-region"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].region").exists());
    }
}
