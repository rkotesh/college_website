package edu.ciet.erp.repository;

import edu.ciet.erp.model.Certification;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface CertificationRepository extends MongoRepository<Certification, String> {
    List<Certification> findAllByRollNoIgnoreCase(String rollNo);
}
