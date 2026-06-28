package gh.foodtrace.analytics.service;

/**
 * Abstraction over evidence-file storage so the recall API doesn't depend
 * directly on AWS. Production uses S3 ({@link S3StorageService}); tests and
 * local dev without AWS credentials use {@link LocalStorageService}.
 */
public interface StorageService {

    /**
     * Stores the given bytes and returns a URL/locator for the stored object.
     *
     * @param key         object key (path) within the bucket
     * @param content     raw file bytes
     * @param contentType MIME type, e.g. {@code application/pdf}
     * @return a URL pointing at the stored object
     */
    String upload(String key, byte[] content, String contentType);
}
