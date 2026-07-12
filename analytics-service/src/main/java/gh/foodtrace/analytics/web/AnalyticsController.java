package gh.foodtrace.analytics.web;

import gh.foodtrace.analytics.dto.BatchesByStatusDto;
import gh.foodtrace.analytics.dto.FarmsByRegionDto;
import gh.foodtrace.analytics.dto.RecallsByMonthDto;
import gh.foodtrace.analytics.dto.SummaryDto;
import gh.foodtrace.analytics.service.AnalyticsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Read-only analytics API consumed by the regulator dashboard (Day 9 charts).
 * Each endpoint returns frontend-ready JSON DTOs computed by {@link AnalyticsService}.
 */
@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analytics;

    public AnalyticsController(AnalyticsService analytics) {
        this.analytics = analytics;
    }

    /** Headline KPI figures for the summary cards. */
    @GetMapping("/summary")
    public SummaryDto summary() {
        return analytics.getSummary();
    }

    /** Batch counts grouped by lifecycle status (bar chart). */
    @GetMapping("/batches-by-status")
    public List<BatchesByStatusDto> batchesByStatus() {
        return analytics.batchesByStatus();
    }

    /** Recall counts grouped by month (line chart). */
    @GetMapping("/recalls-by-month")
    public List<RecallsByMonthDto> recallsByMonth() {
        return analytics.recallsByMonth();
    }

    /** Farm counts grouped by region (pie chart). */
    @GetMapping("/farms-by-region")
    public List<FarmsByRegionDto> farmsByRegion() {
        return analytics.farmsByRegion();
    }
}
