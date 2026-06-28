package gh.foodtrace.analytics.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

/**
 * Fallback storage used when S3 is disabled (the default, and always in tests):
 * it doesn't touch AWS, just logs and returns a {@code local://} locator. This
 * keeps the recall evidence endpoint fully exercisable without credentials.
 *
 * <p>Active when {@code storage.s3.enabled} is false or absent.
 */
@Service
@ConditionalOnProperty(name = "storage.s3.enabled", havingValue = "false", matchIfMissing = true)
public class LocalStorageService implements StorageService {

    private static final Logger log = LoggerFactory.getLogger(LocalStorageService.class);

    @Override
    public String upload(String key, byte[] content, String contentType) {
        log.info("[local-storage] stub upload: key={} ({} bytes, {})",
                key, content.length, contentType);
        return "local://evidence/" + key;
    }
}
