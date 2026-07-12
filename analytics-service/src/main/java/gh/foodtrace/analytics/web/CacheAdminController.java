package gh.foodtrace.analytics.web;

import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Lets an operator flush the analytics caches on demand — handy during a demo
 * when seed data changes underneath a cached aggregate and you want the next
 * request to recompute immediately rather than waiting out the TTL.
 */
@RestController
@RequestMapping("/api/analytics/cache")
public class CacheAdminController {

    private final CacheManager cacheManager;

    public CacheAdminController(CacheManager cacheManager) {
        this.cacheManager = cacheManager;
    }

    /** Clears every analytics cache and reports which ones were evicted. */
    @PostMapping("/evict")
    public Map<String, Object> evictAll() {
        var names = cacheManager.getCacheNames();
        for (String name : names) {
            Cache cache = cacheManager.getCache(name);
            if (cache != null) {
                cache.clear();
            }
        }
        return Map.of("evicted", names, "count", names.size());
    }
}
