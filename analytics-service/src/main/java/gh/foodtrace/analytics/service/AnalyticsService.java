package gh.foodtrace.analytics.service;

import gh.foodtrace.analytics.dto.BatchesByStatusDto;
import gh.foodtrace.analytics.dto.FarmsByRegionDto;
import gh.foodtrace.analytics.dto.RecallsByMonthDto;
import gh.foodtrace.analytics.dto.SummaryDto;
import gh.foodtrace.analytics.repo.BatchRepository;
import gh.foodtrace.analytics.repo.FarmRepository;
import gh.foodtrace.analytics.repo.InputLogRepository;
import gh.foodtrace.analytics.repo.RecallRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Computes the read-only aggregates the regulator dashboard charts. Each method
 * turns a repository grouping query into a list of frontend-ready DTOs. These
 * are the methods Day 4 will wrap with {@code @Cacheable}.
 */
@Service
public class AnalyticsService {

    private static final String STATUS_ACTIVE = "ACTIVE";

    private final BatchRepository batches;
    private final FarmRepository farms;
    private final RecallRepository recalls;
    private final InputLogRepository inputLogs;

    public AnalyticsService(BatchRepository batches, FarmRepository farms,
                            RecallRepository recalls, InputLogRepository inputLogs) {
        this.batches = batches;
        this.farms = farms;
        this.recalls = recalls;
        this.inputLogs = inputLogs;
    }

    /** Headline KPI numbers for the summary cards. */
    @Cacheable("summary")
    public SummaryDto getSummary() {
        return new SummaryDto(
                batches.count(),
                farms.count(),
                recalls.count(),
                recalls.countByStatus(STATUS_ACTIVE),
                inputLogs.findByApprovedFalse().size()
        );
    }

    /** Batch counts grouped by lifecycle status (bar chart). */
    @Cacheable("batchesByStatus")
    public List<BatchesByStatusDto> batchesByStatus() {
        return batches.countByStatus().stream()
                .map(row -> new BatchesByStatusDto(
                        (String) row[0],
                        ((Number) row[1]).longValue()))
                .toList();
    }

    /** Recall counts grouped by calendar month, oldest first (line chart). */
    @Cacheable("recallsByMonth")
    public List<RecallsByMonthDto> recallsByMonth() {
        return recalls.countByMonth().stream()
                .map(row -> {
                    int year = ((Number) row[0]).intValue();
                    int month = ((Number) row[1]).intValue();
                    long count = ((Number) row[2]).longValue();
                    String label = "%04d-%02d".formatted(year, month);
                    return new RecallsByMonthDto(year, month, label, count);
                })
                .toList();
    }

    /** Farm counts grouped by region (pie chart). */
    @Cacheable("farmsByRegion")
    public List<FarmsByRegionDto> farmsByRegion() {
        return farms.countByRegion().stream()
                .map(row -> new FarmsByRegionDto(
                        (String) row[0],
                        ((Number) row[1]).longValue()))
                .toList();
    }
}
