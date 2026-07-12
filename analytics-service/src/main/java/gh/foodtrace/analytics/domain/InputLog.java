package gh.foodtrace.analytics.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Read-only view of the {@code input_logs} table.
 * Every agricultural input applied to a batch — fertiliser, pesticide, feed,
 * veterinary drug — is logged here. This is the backbone of traceability: when a
 * recall happens, regulators trace it back to the exact input that caused it
 * (e.g. an unapproved pesticide with too short a pre-harvest interval).
 */
@Entity
@Table(name = "input_logs")
@Getter
public class InputLog {

    @Id
    private Long id;

    /** Batch the input was applied to; mirrors {@code input_logs.batch_id}. */
    @Column(name = "batch_id", nullable = false)
    private Long batchId;

    /** FERTILIZER, PESTICIDE, HERBICIDE, FEED, VET_DRUG, WATER_TREATMENT. */
    @Column(name = "input_type", nullable = false)
    private String inputType;

    /** Trade/active name of the substance applied, e.g. "Lambda-cyhalothrin". */
    @Column(name = "substance", nullable = false)
    private String substance;

    @Column(name = "quantity")
    private BigDecimal quantity;

    /** Unit for {@link #quantity}, e.g. kg, L, mL, g. */
    @Column(name = "unit")
    private String unit;

    @Column(name = "applied_at", nullable = false)
    private LocalDate appliedAt;

    /** Whether the substance is on Ghana's EPA/PPRSD approved list; false = compliance flag. */
    @Column(name = "approved", nullable = false)
    private boolean approved;
}
