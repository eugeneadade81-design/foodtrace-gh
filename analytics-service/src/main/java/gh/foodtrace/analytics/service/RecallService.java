package gh.foodtrace.analytics.service;

import gh.foodtrace.analytics.domain.Batch;
import gh.foodtrace.analytics.domain.Recall;
import gh.foodtrace.analytics.dto.CreateRecallRequest;
import gh.foodtrace.analytics.dto.RecallDto;
import gh.foodtrace.analytics.repo.BatchRepository;
import gh.foodtrace.analytics.repo.FarmRepository;
import gh.foodtrace.analytics.repo.RecallRepository;
import gh.foodtrace.analytics.sms.SmsSender;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Recall command desk: regulators list, view, open, and progress recalls.
 * Read methods power the recall management screen (Day 10); {@link #updateStatus}
 * to ACTIVE is the hook Day 7 uses to fire SMS alerts to affected farmers.
 */
@Service
public class RecallService {

    private static final String STATUS_DRAFT = "DRAFT";
    private static final String STATUS_RESOLVED = "RESOLVED";
    private static final String STATUS_ACTIVE = "ACTIVE";

    private final RecallRepository recalls;
    private final BatchRepository batches;
    private final FarmRepository farms;
    private final SmsSender sms;

    public RecallService(RecallRepository recalls, BatchRepository batches,
                         FarmRepository farms, SmsSender sms) {
        this.recalls = recalls;
        this.batches = batches;
        this.farms = farms;
        this.sms = sms;
    }

    /** All recalls, optionally narrowed by status and/or region (case-insensitive). */
    public List<RecallDto> list(String status, String region) {
        return recalls.findAll().stream()
                .filter(r -> status == null || status.isBlank()
                        || r.getStatus().equalsIgnoreCase(status))
                .filter(r -> region == null || region.isBlank()
                        || r.getRegion().equalsIgnoreCase(region))
                .map(RecallDto::from)
                .toList();
    }

    /** One recall, or 404 if it doesn't exist. */
    public RecallDto getById(Long id) {
        return recalls.findById(id)
                .map(RecallDto::from)
                .orElseThrow(() -> notFound(id));
    }

    /** Returns the managed entity or throws 404 — used where the entity is needed. */
    public Recall getEntity(Long id) {
        return recalls.findById(id).orElseThrow(() -> notFound(id));
    }

    /** Opens a new recall in DRAFT status with a server-generated code. */
    @Transactional
    public RecallDto create(CreateRecallRequest req) {
        LocalDateTime now = LocalDateTime.now();
        Recall r = new Recall();
        r.setBatchId(req.batchId());
        r.setReason(req.reason());
        r.setSeverity(req.severity());
        r.setRegion(req.region());
        r.setInitiatedBy(req.initiatedBy());
        r.setStatus(STATUS_DRAFT);
        r.setCreatedAt(now);
        // recall_code is NOT NULL + UNIQUE and the human-readable code embeds the
        // DB-generated id, so save once with a unique placeholder, then set the
        // real code (both writes share this transaction).
        r.setRecallCode("TMP-" + UUID.randomUUID());
        Recall saved = recalls.save(r);
        saved.setRecallCode("RCL-%d-%03d".formatted(now.getYear(), saved.getId()));
        return RecallDto.from(recalls.save(saved));
    }

    /**
     * Changes a recall's status; moving to RESOLVED stamps resolvedAt, and the
     * transition into ACTIVE fires an SMS alert to the affected farmer.
     */
    @Transactional
    public RecallDto updateStatus(Long id, String status) {
        Recall r = getEntity(id);
        String previous = r.getStatus();
        String normalized = status.toUpperCase();
        r.setStatus(normalized);
        if (STATUS_RESOLVED.equals(normalized)) {
            r.setResolvedAt(LocalDateTime.now());
        }
        Recall saved = recalls.save(r);

        // Only on the edge into ACTIVE (not on repeated ACTIVE saves).
        if (STATUS_ACTIVE.equals(normalized) && !STATUS_ACTIVE.equals(previous)) {
            notifyAffectedFarmer(saved);
        }
        return RecallDto.from(saved);
    }

    /** Resolves the affected farmer's phone via batch -> farm and sends the alert. */
    private void notifyAffectedFarmer(Recall recall) {
        Optional<String> phone = batches.findById(recall.getBatchId())
                .map(Batch::getFarmId)
                .flatMap(farms::findById)
                .map(f -> f.getPhoneNumber())
                .filter(p -> p != null && !p.isBlank());
        if (phone.isEmpty()) {
            return;
        }
        String batchCode = batches.findById(recall.getBatchId())
                .map(Batch::getBatchCode).orElse("batch " + recall.getBatchId());
        String message = "FoodTrace ALERT: Recall %s (%s) affecting %s. Reason: %s. Action required."
                .formatted(recall.getRecallCode(), recall.getSeverity(), batchCode, recall.getReason());
        sms.send(List.of(phone.get()), message);
    }

    private ResponseStatusException notFound(Long id) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Recall " + id + " not found");
    }
}
