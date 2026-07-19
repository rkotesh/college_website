package edu.ciet.erp.repository;

import edu.ciet.erp.model.TrainingProgram;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface TrainingProgramRepository extends MongoRepository<TrainingProgram, String> {
    List<TrainingProgram> findAllByDepartmentId(String departmentId);
    List<TrainingProgram> findAllByDepartmentIdAndIsActive(String departmentId, boolean isActive);
}
