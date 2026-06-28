package gh.foodtrace.analytics.dto;

import gh.foodtrace.analytics.domain.Recall;

import java.time.LocalDateTime;

/**
 * API representation of a recall returned to the regulator dashboard.
 */
public record RecallDto(
        Long id,
        String recallCode,
        Long batchId,
        String reason,
        String severity,
        String status,
        String region,
        String initiatedBy,
        LocalDateTime createdAt,
        LocalDateTime resolvedAt
) {
    public static RecallDto from(Recall r) {
        return new RecallDto(
                r.getId(),
                r.getRecallCode(),
                r.getBatchId(),
                r.getReason(),
                r.getSeverity(),
                r.getStatus(),
                r.getRegion(),
                r.getInitiatedBy(),
                r.getCreatedAt(),
                r.getResolvedAt()
        );
    }
}
