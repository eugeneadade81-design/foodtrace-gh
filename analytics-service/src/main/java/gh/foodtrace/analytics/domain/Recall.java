package gh.foodtrace.analytics.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Read-only view of the {@code recalls} table.
 * A recall is raised against a single {@link Batch} when a food-safety issue is
 * found (contamination, banned pesticide residue, spoilage). Activating a recall
 * is what triggers the SMS alert flow on Day 7; the dashboard charts these over time.
 */
@Entity
@Table(name = "recalls")
@Getter
public class Recall {

    @Id
    private Long id;

    /** Public reference for the recall notice, e.g. {@code RCL-2026-014}. */
    @Column(name = "recall_code", nullable = false, unique = true)
    private String recallCode;

    /** The batch being recalled; mirrors {@code recalls.batch_id}. */
    @Column(name = "batch_id", nullable = false)
    private Long batchId;

    @Column(name = "reason", nullable = false, length = 500)
    private String reason;

    /** LOW, MEDIUM, HIGH, CRITICAL — drives alert urgency and dashboard colour coding. */
    @Column(name = "severity", nullable = false)
    private String severity;

    /** DRAFT, ACTIVE, RESOLVED, CANCELLED. */
    @Column(name = "status", nullable = false)
    private String status;

    /** Denormalised region of the affected farm, kept for fast region filtering. */
    @Column(name = "region", nullable = false)
    private String region;

    /** Regulator/officer who raised the recall (FDA or GSA). */
    @Column(name = "initiated_by")
    private String initiatedBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;
}
