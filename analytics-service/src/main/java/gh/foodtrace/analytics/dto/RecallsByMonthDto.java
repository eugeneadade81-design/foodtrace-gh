package gh.foodtrace.analytics.dto;

/**
 * One point on the "Recalls by Month" line chart.
 *
 * @param year  calendar year
 * @param month calendar month (1-12)
 * @param label pre-formatted {@code YYYY-MM} label so the frontend can plot the
 *              x-axis directly without reformatting
 * @param count recalls raised in that month
 */
public record RecallsByMonthDto(int year, int month, String label, long count) {
}
