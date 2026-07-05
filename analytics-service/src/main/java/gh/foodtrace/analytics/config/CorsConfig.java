package gh.foodtrace.analytics.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Allows the React regulator dashboard (Vite dev server, and later the deployed
 * Amplify origin) to call this API from the browser. Origins are configurable
 * via {@code CORS_ALLOWED_ORIGINS} so the live Amplify URL can be added without
 * a code change.
 *
 * <p>Uses {@code allowedOriginPatterns} with a {@code localhost:*} default so a
 * local run still works when Vite falls back to a different port (e.g. 5174 when
 * 5173 is busy) — the previous fixed {@code localhost:5173} default caused a
 * silent CORS failure ("Network Error") whenever the port drifted.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private final String[] allowedOriginPatterns;

    public CorsConfig(@Value("${cors.allowed-origins:http://localhost:*,http://127.0.0.1:*}")
                      String[] allowedOriginPatterns) {
        this.allowedOriginPatterns = allowedOriginPatterns;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns(allowedOriginPatterns)
                .allowedMethods("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
