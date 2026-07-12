package gh.foodtrace.analytics.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

/**
 * Wiring for the Africa's Talking SMS gateway. Only active when
 * {@code sms.africastalking.enabled=true}; otherwise the app uses the local SMS
 * stub and never needs these beans or credentials.
 */
@Configuration
@ConditionalOnProperty(name = "sms.africastalking.enabled", havingValue = "true")
public class AfricasTalkingConfig {

    @Bean
    public RestTemplate africasTalkingRestTemplate(RestTemplateBuilder builder) {
        return builder
                .setConnectTimeout(Duration.ofSeconds(5))
                .setReadTimeout(Duration.ofSeconds(10))
                .build();
    }
}
