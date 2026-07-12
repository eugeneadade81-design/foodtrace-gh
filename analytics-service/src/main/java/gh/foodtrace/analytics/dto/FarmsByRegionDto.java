package gh.foodtrace.analytics.dto;

/**
 * One slice of the "Farms by Region" pie chart: a region and its farm count.
 */
public record FarmsByRegionDto(String region, long count) {
}
