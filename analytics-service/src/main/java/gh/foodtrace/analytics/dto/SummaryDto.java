package gh.foodtrace.analytics.dto;

/**
 * Headline KPI figures for the dashboard's summary cards.
 *
 * @param totalBatches    all batches currently tracked
 * @param totalFarms      registered farms
 * @param totalRecalls    recalls raised, any status
 * @param activeRecalls   recalls currently in ACTIVE status (the urgent number)
 * @param complianceFlags input-log entries using an unapproved substance
 */
public record SummaryDto(
        long totalBatches,
        long totalFarms,
        long totalRecalls,
        long activeRecalls,
        long complianceFlags
) {
}
