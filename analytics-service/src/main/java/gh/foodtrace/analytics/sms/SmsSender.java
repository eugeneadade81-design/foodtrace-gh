package gh.foodtrace.analytics.sms;

import java.util.List;

/**
 * Sends SMS alerts to farmers/sellers. Two implementations exist: the real
 * Africa's Talking sender (enabled via {@code sms.africastalking.enabled=true})
 * and a recording stub used by default so dev/test runs need no SMS credentials.
 */
public interface SmsSender {

    /**
     * Sends {@code message} to each recipient MSISDN.
     *
     * @return the number of recipients the message was dispatched to
     */
    int send(List<String> recipients, String message);
}
