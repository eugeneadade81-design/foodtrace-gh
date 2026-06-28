package gh.foodtrace.analytics.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Payload for changing a recall's status, e.g. DRAFT -> ACTIVE -> RESOLVED.
 * Activating a recall (status ACTIVE) is what triggers the SMS alert flow in
 * Day 7; moving to RESOLVED stamps resolvedAt.
 */
public record RecallUpdateRequest(
        @NotBlank(message = "status is required")
        String status
) {
}
