package gh.foodtrace.analytics.ussd;

/**
 * Builds Africa's Talking USSD reply strings. The gateway interprets the first
 * token of the response body:
 * <ul>
 *   <li>{@code CON } — keep the session open and prompt for more input</li>
 *   <li>{@code END } — show the message and terminate the session</li>
 * </ul>
 */
public final class UssdResponse {

    private UssdResponse() {
    }

    /** Continue the session (expecting further input). */
    public static String con(String body) {
        return "CON " + body;
    }

    /** End the session with a final message. */
    public static String end(String body) {
        return "END " + body;
    }
}
