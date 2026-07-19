package edu.ciet.erp.repository;

import edu.ciet.erp.model.AccreditationChecklist;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface AccreditationChecklistRepository extends MongoRepository<AccreditationChecklist, String> {
    List<AccreditationChecklist> findAllByDepartmentId(String departmentId);
}
