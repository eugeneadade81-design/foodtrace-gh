package gh.foodtrace.analytics.repo;

import gh.foodtrace.analytics.domain.Recall;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface RecallRepository extends JpaRepository<Recall, Long> {

    List<Recall> findByStatus(String status);

    List<Recall> findByRegion(String region);

    long countByStatus(String status);

    /**
     * Recall count grouped by year-month — feeds the "Recalls by Month" line
     * chart (Day 9). Returns rows of {@code [year, month, count]}.
     */
    @Query("select year(r.createdAt), month(r.createdAt), count(r) "
            + "from Recall r group by year(r.createdAt), month(r.createdAt) "
            + "order by year(r.createdAt), month(r.createdAt)")
    List<Object[]> countByMonth();
}
