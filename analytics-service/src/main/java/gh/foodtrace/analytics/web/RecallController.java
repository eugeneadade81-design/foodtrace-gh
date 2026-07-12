package gh.foodtrace.analytics.web;

import gh.foodtrace.analytics.dto.CreateRecallRequest;
import gh.foodtrace.analytics.dto.RecallDto;
import gh.foodtrace.analytics.dto.RecallUpdateRequest;
import gh.foodtrace.analytics.service.RecallService;
import gh.foodtrace.analytics.service.StorageService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * Recall management API for the regulator dashboard: list/filter, view, open,
 * progress status, and attach evidence files (stored via {@link StorageService}).
 */
@RestController
@RequestMapping("/api/recalls")
public class RecallController {

    private final RecallService recalls;
    private final StorageService storage;

    public RecallController(RecallService recalls, StorageService storage) {
        this.recalls = recalls;
        this.storage = storage;
    }

    /** List recalls, optionally filtered by status and/or region. */
    @GetMapping
    public List<RecallDto> list(@RequestParam(required = false) String status,
                                @RequestParam(required = false) String region) {
        return recalls.list(status, region);
    }

    /** Fetch a single recall (404 if missing). */
    @GetMapping("/{id}")
    public RecallDto get(@PathVariable Long id) {
        return recalls.getById(id);
    }

    /** Open a new recall (DRAFT). */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RecallDto create(@Valid @RequestBody CreateRecallRequest request) {
        return recalls.create(request);
    }

    /** Change a recall's status (e.g. ACTIVE, RESOLVED). */
    @PatchMapping("/{id}/status")
    public RecallDto updateStatus(@PathVariable Long id,
                                  @Valid @RequestBody RecallUpdateRequest request) {
        return recalls.updateStatus(id, request.status());
    }

    /** Upload an evidence file (lab report, photo) for a recall to storage. */
    @PostMapping("/{id}/evidence")
    public ResponseEntity<Map<String, Object>> uploadEvidence(@PathVariable Long id,
                                                              @RequestParam("file") MultipartFile file) throws IOException {
        // 404s if the recall doesn't exist before we store anything.
        recalls.getEntity(id);
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "file is empty"));
        }
        String key = "recalls/%d/%s".formatted(id, file.getOriginalFilename());
        String url = storage.upload(key, file.getBytes(), file.getContentType());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("recallId", id, "key", key, "url", url));
    }
}
