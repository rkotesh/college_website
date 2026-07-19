package edu.ciet.erp.repository;

import edu.ciet.erp.model.CourseOutcomeAttainment;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface CourseOutcomeAttainmentRepository extends MongoRepository<CourseOutcomeAttainment, String> {
    List<CourseOutcomeAttainment> findAllByDepartmentId(String departmentId);
    List<CourseOutcomeAttainment> findAllBySubjectCode(String subjectCode);
}
