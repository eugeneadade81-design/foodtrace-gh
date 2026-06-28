package gh.foodtrace.analytics.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

/**
 * Uploads recall evidence (lab reports, photos) to AWS S3. Active only when
 * {@code storage.s3.enabled=true} (set on AWS in Day 11); otherwise
 * {@link LocalStorageService} is used so the build needs no credentials.
 */
@Service
@ConditionalOnProperty(name = "storage.s3.enabled", havingValue = "true")
public class S3StorageService implements StorageService {

    private final S3Client s3;
    private final String bucket;

    public S3StorageService(S3Client s3, @Value("${storage.s3.bucket}") String bucket) {
        this.s3 = s3;
        this.bucket = bucket;
    }

    @Override
    public String upload(String key, byte[] content, String contentType) {
        s3.putObject(
                PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .contentType(contentType)
                        .build(),
                RequestBody.fromBytes(content));
        return "https://%s.s3.amazonaws.com/%s".formatted(bucket, key);
    }
}
