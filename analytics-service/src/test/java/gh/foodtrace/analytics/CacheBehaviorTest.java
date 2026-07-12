package gh.foodtrace.analytics;

import gh.foodtrace.analytics.service.AnalyticsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cache.CacheManager;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Proves the @Cacheable wiring works without needing a Redis server. Under the
 * test profile the cache is in-memory, but the caching semantics are identical:
 * a cache hit returns the exact same object the method first produced (the body
 * does not re-run), and clearing the cache forces a recompute.
 */
@SpringBootTest
@ActiveProfiles("test")
class CacheBehaviorTest {

    @Autowired
    private AnalyticsService service;
    @Autowired
    private CacheManager cacheManager;

    @Test
    void secondCallIsServedFromCache() {
        var first = service.batchesByStatus();
        var second = service.batchesByStatus();
        // Same instance => the method body was skipped on the 2nd call (cache hit).
        assertThat(second).isSameAs(first);
    }

    @Test
    void evictForcesRecompute() {
        var first = service.batchesByStatus();
        cacheManager.getCache("batchesByStatus").clear();
        var afterEvict = service.batchesByStatus();
        // Different instance => body re-ran after the cache was cleared.
        assertThat(afterEvict).isNotSameAs(first);
    }
}
