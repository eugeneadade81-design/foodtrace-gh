package gh.foodtrace.analytics.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Read-only view of the {@code batches} table owned by Role 1.
 * A batch is a traceable lot of produce (a harvest of tomatoes, a flock of
 * broilers, a pond of tilapia) that moves through the supply chain. The
 * analytics service aggregates these for the regulator dashboard but never
 * writes to the table.
 */
@Entity
@Table(name = "batches")
@Getter
public class Batch {

    @Id
    private Long id;

    /** Human-facing traceability code printed on the batch label, e.g. {@code FT-TOM-0007}. */
    @Column(name = "batch_code", nullable = false, unique = true)
    private String batchCode;

    @Column(name = "product_name", nullable = false)
    private String productName;

    /** Broad produce group used for filtering/grouping, e.g. VEGETABLE, POULTRY, AQUACULTURE. */
    @Column(name = "category", nullable = false)
    private String category;

    /** Owning farm; mirrors {@code batches.farm_id}. */
    @Column(name = "farm_id", nullable = false)
    private Long farmId;

    /** Lifecycle stage: HARVESTED, IN_TRANSIT, AT_MARKET, SOLD, FLAGGED, RECALLED. */
    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "quantity_kg", nullable = false)
    private BigDecimal quantityKg;

    /** Farm-gate price per kg in Ghana Cedis, used for loss estimates on recalls. */
    @Column(name = "unit_price_ghs")
    private BigDecimal unitPriceGhs;

    @Column(name = "harvest_date", nullable = false)
    private LocalDate harvestDate;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
