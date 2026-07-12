package gh.foodtrace.analytics.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Payload to open a new recall. The server assigns the id, generates the
 * recall code, sets status to DRAFT, and stamps createdAt.
 */
public record CreateRecallRequest(
        @NotNull(message = "batchId is required")
        Long batchId,

        @NotBlank(message = "reason is required")
        String reason,

        @NotBlank(message = "severity is required")
        String severity,

        @NotBlank(message = "region is required")
        String region,

        @NotBlank(message = "initiatedBy is required")
        String initiatedBy
) {
}
