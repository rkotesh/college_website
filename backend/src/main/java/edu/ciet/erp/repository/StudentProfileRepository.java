package edu.ciet.erp.repository;

import edu.ciet.erp.model.StudentProfile;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface StudentProfileRepository extends MongoRepository<StudentProfile, String> {
    Optional<StudentProfile> findByRollNoIgnoreCase(String rollNo);
    boolean existsByRollNoIgnoreCase(String rollNo);
    Optional<StudentProfile> findByUserId(String userId);
    Optional<StudentProfile> findBySlug(String slug);
    java.util.List<StudentProfile> findAllByDepartmentId(String departmentId);
}
