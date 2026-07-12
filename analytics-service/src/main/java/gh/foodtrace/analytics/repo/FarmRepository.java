package gh.foodtrace.analytics.repo;

import gh.foodtrace.analytics.domain.Farm;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface FarmRepository extends JpaRepository<Farm, Long> {

    List<Farm> findByRegion(String region);

    /**
     * Farm count grouped by region — feeds the "Farms by Region" pie chart (Day 9).
     * Returns rows of {@code [region, count]}.
     */
    @Query("select f.region, count(f) from Farm f group by f.region order by count(f) desc")
    List<Object[]> countByRegion();
}
