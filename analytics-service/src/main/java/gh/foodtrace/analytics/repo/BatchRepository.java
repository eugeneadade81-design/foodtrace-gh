package gh.foodtrace.analytics.repo;

import gh.foodtrace.analytics.domain.Batch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface BatchRepository extends JpaRepository<Batch, Long> {

    List<Batch> findByStatus(String status);

    List<Batch> findByFarmId(Long farmId);

    /**
     * Batch count grouped by lifecycle status — feeds the "Batches by Status"
     * bar chart (Day 9). Returns rows of {@code [status, count]}.
     */
    @Query("select b.status, count(b) from Batch b group by b.status order by count(b) desc")
    List<Object[]> countByStatus();
}
