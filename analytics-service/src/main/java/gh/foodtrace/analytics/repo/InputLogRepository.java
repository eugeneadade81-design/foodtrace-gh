package gh.foodtrace.analytics.repo;

import gh.foodtrace.analytics.domain.InputLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InputLogRepository extends JpaRepository<InputLog, Long> {

    List<InputLog> findByBatchId(Long batchId);

    /** Compliance view: inputs that used a substance not on the approved list. */
    List<InputLog> findByApprovedFalse();
}
