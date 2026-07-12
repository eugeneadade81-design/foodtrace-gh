package gh.foodtrace.analytics.sms;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.List;

/**
 * Real {@link SmsSender} backed by the Africa's Talking SMS REST API. Activated
 * by {@code sms.africastalking.enabled=true}; credentials and endpoint come from
 * env-backed properties so no secrets live in the repo. Sandbox defaults let you
 * test against AT's simulator before going live.
 */
@Component
@ConditionalOnProperty(name = "sms.africastalking.enabled", havingValue = "true")
public class AfricasTalkingSmsSender implements SmsSender {

    private static final Logger log = LoggerFactory.getLogger(AfricasTalkingSmsSender.class);

    private final RestTemplate rest;
    private final String baseUrl;
    private final String username;
    private final String apiKey;
    private final String senderId;

    public AfricasTalkingSmsSender(
            RestTemplate africasTalkingRestTemplate,
            @Value("${sms.africastalking.base-url}") String baseUrl,
            @Value("${sms.africastalking.username}") String username,
            @Value("${sms.africastalking.api-key}") String apiKey,
            @Value("${sms.africastalking.sender-id:}") String senderId) {
        this.rest = africasTalkingRestTemplate;
        this.baseUrl = baseUrl;
        this.username = username;
        this.apiKey = apiKey;
        this.senderId = senderId;
    }

    @Override
    public int send(List<String> recipients, String message) {
        if (recipients.isEmpty()) {
            return 0;
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.set("apiKey", apiKey);

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("username", username);
        form.add("to", String.join(",", recipients));
        form.add("message", message);
        if (senderId != null && !senderId.isBlank()) {
            form.add("from", senderId);
        }

        try {
            rest.postForEntity(baseUrl, new HttpEntity<>(form, headers), String.class);
            log.info("Africa's Talking: sent SMS to {} recipient(s)", recipients.size());
            return recipients.size();
        } catch (Exception e) {
            // Never let an SMS failure roll back the recall status change.
            log.error("Africa's Talking SMS send failed: {}", e.getMessage());
            return 0;
        }
    }
}
