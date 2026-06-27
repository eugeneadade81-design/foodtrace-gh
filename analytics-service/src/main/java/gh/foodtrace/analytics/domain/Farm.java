package gh.foodtrace.analytics.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Read-only view of the {@code farms} table owned by Role 1.
 * The analytics service never writes to this table; it only aggregates from it.
 */
@Entity
@Table(name = "farms")
@Getter
public class Farm {

    @Id
    private Long id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "region", nullable = false)
    private String region;

    @Column(name = "district")
    private String district;

    @Column(name = "owner_name")
    private String ownerName;

    /** Used by the SMS recall-alert flow (Day 7) to reach the farmer. */
    @Column(name = "phone_number")
    private String phoneNumber;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
