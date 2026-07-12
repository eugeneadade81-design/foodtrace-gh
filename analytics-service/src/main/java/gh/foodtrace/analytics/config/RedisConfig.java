package gh.foodtrace.analytics.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.Map;

/**
 * Redis-backed cache for the analytics aggregates so the dashboard loads fast
 * and doesn't recompute on every page view. Each cache gets a TTL tuned to how
 * often its underlying data really changes.
 *
 * <p><b>Opt-in.</b> This is only active when {@code spring.cache.type=redis}
 * (set {@code CACHE_TYPE=redis} in the AWS/prod environment). Locally and in
 * tests the app defaults to Spring's in-memory {@code simple} cache so it runs
 * with no Redis server — {@code @Cacheable} still works end-to-end. Cache names
 * here must match the {@code @Cacheable} names in {@code AnalyticsService}.
 */
@Configuration
@Profile("!test")
@ConditionalOnProperty(name = "spring.cache.type", havingValue = "redis")
public class RedisConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration defaults = RedisCacheConfiguration.defaultCacheConfig()
                .disableCachingNullValues()
                .serializeKeysWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new GenericJackson2JsonRedisSerializer()));

        // Per-cache TTLs: fast-moving headline numbers expire sooner than the
        // historical monthly/region breakdowns.
        Map<String, RedisCacheConfiguration> perCache = Map.of(
                "summary",         defaults.entryTtl(Duration.ofSeconds(60)),
                "batchesByStatus", defaults.entryTtl(Duration.ofSeconds(120)),
                "recallsByMonth",  defaults.entryTtl(Duration.ofSeconds(300)),
                "farmsByRegion",   defaults.entryTtl(Duration.ofSeconds(300))
        );

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaults.entryTtl(Duration.ofSeconds(120)))
                .withInitialCacheConfigurations(perCache)
                .build();
    }
}
