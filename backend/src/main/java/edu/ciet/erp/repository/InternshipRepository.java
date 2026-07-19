package edu.ciet.erp.repository;

import edu.ciet.erp.model.Internship;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface InternshipRepository extends MongoRepository<Internship, String> {
    List<Internship> findAllByRollNoIgnoreCase(String rollNo);
}
