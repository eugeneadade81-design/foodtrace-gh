package gh.foodtrace.analytics;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Drives the *714*FOOD# USSD menu through the controller against seeded H2 data.
 * Seed facts used: batch FT-VEG-0001 = Cabbage/SOLD/Asante Akyem Organic Farms;
 * 2 ACTIVE recalls (RCL-2025-003, RCL-2025-004).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UssdFlowTest {

    @Autowired
    private MockMvc mvc;

    private org.springframework.test.web.servlet.ResultActions dial(String text) throws Exception {
        return mvc.perform(post("/api/ussd")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .param("sessionId", "sess-1")
                .param("phoneNumber", "+233241000999")
                .param("text", text));
    }

    @Test
    void emptyTextShowsMainMenu() throws Exception {
        dial("").andExpect(status().isOk())
                .andExpect(content().string(startsWith("CON ")))
                .andExpect(content().string(containsString("1. Verify a batch")))
                .andExpect(content().string(containsString("3. Active recalls")));
    }

    @Test
    void verifyPromptThenKnownBatch() throws Exception {
        dial("1").andExpect(content().string(startsWith("CON ")))
                 .andExpect(content().string(containsString("Enter batch code")));

        dial("1*FT-VEG-0001").andExpect(content().string(startsWith("END ")))
                 .andExpect(content().string(containsString("Cabbage")))
                 .andExpect(content().string(containsString("SOLD")))
                 .andExpect(content().string(containsString("Asante Akyem")));
    }

    @Test
    void verifyUnknownBatch() throws Exception {
        dial("1*FT-NOPE-9999").andExpect(content().string(startsWith("END ")))
                 .andExpect(content().string(containsString("not found")));
    }

    @Test
    void reportPromptThenCapture() throws Exception {
        dial("2").andExpect(content().string(containsString("Describe")));

        dial("2*Spoiled fish sold at Kaneshie market")
                 .andExpect(content().string(startsWith("END ")))
                 .andExpect(content().string(containsString("Report received")))
                 .andExpect(content().string(containsString("Reference:")));
    }

    @Test
    void activeRecallsListed() throws Exception {
        dial("3").andExpect(content().string(startsWith("END ")))
                 .andExpect(content().string(containsString("Active recalls")))
                 .andExpect(content().string(containsString("RCL-2025-003")));
    }

    @Test
    void invalidChoiceEndsSession() throws Exception {
        dial("9").andExpect(content().string(startsWith("END ")))
                 .andExpect(content().string(containsString("Invalid choice")));
    }
}
