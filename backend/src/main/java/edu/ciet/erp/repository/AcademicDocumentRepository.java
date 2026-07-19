package edu.ciet.erp.repository;

import edu.ciet.erp.model.AcademicDocument;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface AcademicDocumentRepository extends MongoRepository<AcademicDocument, String> {
    List<AcademicDocument> findAllByDepartmentId(String departmentId);
}
