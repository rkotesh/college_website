package edu.ciet.erp.repository;

import edu.ciet.erp.model.EducationBackground;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface EducationBackgroundRepository extends MongoRepository<EducationBackground, String> {
    List<EducationBackground> findAllByRollNoIgnoreCase(String rollNo);
    Optional<EducationBackground> findByRollNoIgnoreCaseAndEduType(String rollNo, String eduType);
}
