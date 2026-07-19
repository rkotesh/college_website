package edu.ciet.erp.repository;

import edu.ciet.erp.model.SyllabusCoverage;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface SyllabusCoverageRepository extends MongoRepository<SyllabusCoverage, String> {
    List<SyllabusCoverage> findAllByDepartmentId(String departmentId);
}
