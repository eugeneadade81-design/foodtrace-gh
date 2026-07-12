package gh.foodtrace.analytics.dto;

/**
 * One bar in the "Batches by Status" chart: a lifecycle status and how many
 * batches are in it.
 */
public record BatchesByStatusDto(String status, long count) {
}
