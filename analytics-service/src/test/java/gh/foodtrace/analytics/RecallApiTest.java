package gh.foodtrace.analytics;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Exercises the recall management API against seeded H2 data using the local
 * storage stub (no AWS). Assertions use stable seed facts (2 ACTIVE recalls,
 * 2 in Volta) and code patterns rather than exact generated ids, because the
 * identity counter advances as create tests run.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional  // roll back each test's writes so the shared H2 stays at seed state
class RecallApiTest {

    @Autowired
    private MockMvc mvc;
    @Autowired
    private ObjectMapper json;

    @Test
    void listsAllSeededRecalls() throws Exception {
        mvc.perform(get("/api/recalls"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(greaterThanOrEqualTo(5)));
    }

    @Test
    void filtersByStatusAndRegion() throws Exception {
        mvc.perform(get("/api/recalls").param("status", "ACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
        mvc.perform(get("/api/recalls").param("region", "Volta"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void getByIdReturnsSeededRecallAnd404ForUnknown() throws Exception {
        mvc.perform(get("/api/recalls/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recallCode").value("RCL-2025-001"));
        mvc.perform(get("/api/recalls/999999"))
                .andExpect(status().isNotFound());
    }

    @Test
    void createReturnsGeneratedCodeAndDraftStatus() throws Exception {
        mvc.perform(post("/api/recalls")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"batchId":14,"reason":"Routine surveillance sample failed.",
                                 "severity":"MEDIUM","region":"Greater Accra","initiatedBy":"FDA Ghana - Test"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(greaterThanOrEqualTo(6)))
                .andExpect(jsonPath("$.recallCode").value(matchesPattern("RCL-\\d{4}-\\d+")))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.resolvedAt").doesNotExist());
    }

    @Test
    void createRejectsMissingRequiredFields() throws Exception {
        mvc.perform(post("/api/recalls")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"missing batchId and others\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateStatusToResolvedStampsResolvedAt() throws Exception {
        MvcResult created = mvc.perform(post("/api/recalls")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"batchId":14,"reason":"For status transition test.",
                                 "severity":"LOW","region":"Greater Accra","initiatedBy":"FDA Ghana - Test"}
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        long id = json.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        mvc.perform(patch("/api/recalls/" + id + "/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"RESOLVED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"))
                .andExpect(jsonPath("$.resolvedAt").exists());
    }

    @Test
    void uploadEvidenceStoresFileAndReturnsUrl() throws Exception {
        MvcResult created = mvc.perform(post("/api/recalls")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"batchId":14,"reason":"For evidence upload test.",
                                 "severity":"HIGH","region":"Greater Accra","initiatedBy":"FDA Ghana - Test"}
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        JsonNode node = json.readTree(created.getResponse().getContentAsString());
        long id = node.get("id").asLong();

        MockMultipartFile file = new MockMultipartFile(
                "file", "lab-report.pdf", "application/pdf", "fake-pdf-bytes".getBytes());

        mvc.perform(multipart("/api/recalls/" + id + "/evidence").file(file))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.recallId").value((int) id))
                .andExpect(jsonPath("$.url").value(startsWith("local://evidence/recalls/" + id)));
    }
}
