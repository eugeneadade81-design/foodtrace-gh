package gh.foodtrace.analytics.ussd;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Webhook for Africa's Talking USSD. The gateway POSTs form-urlencoded params
 * each time the user dials *714*FOOD# or enters a value, and renders whatever
 * plain-text body we return (which must start with {@code CON } or {@code END }).
 *
 * <p>Point the Africa's Talking USSD callback at {@code <public-url>/api/ussd}
 * (e.g. via the ngrok tunnel in tools/ngrok during local testing).
 */
@RestController
public class UssdController {

    private final UssdMenuService menu;

    public UssdController(UssdMenuService menu) {
        this.menu = menu;
    }

    @PostMapping(
            value = "/api/ussd",
            consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE,
            produces = MediaType.TEXT_PLAIN_VALUE)
    public String ussd(
            @RequestParam(required = false) String sessionId,
            @RequestParam(required = false) String serviceCode,
            @RequestParam(required = false) String phoneNumber,
            @RequestParam(required = false, defaultValue = "") String text) {
        return menu.handle(phoneNumber, text);
    }
}
