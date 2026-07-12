package gh.foodtrace.analytics.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

/**
 * Builds the S3 client only when S3 is enabled, so the application context boots
 * without AWS credentials in tests and local dev. The default credentials chain
 * (env vars / instance profile on Elastic Beanstalk) supplies auth in prod.
 */
@Configuration
@ConditionalOnProperty(name = "storage.s3.enabled", havingValue = "true")
public class S3Config {

    @Bean
    public S3Client s3Client(@Value("${storage.s3.region}") String region) {
        return S3Client.builder()
                .region(Region.of(region))
                .build();
    }
}
