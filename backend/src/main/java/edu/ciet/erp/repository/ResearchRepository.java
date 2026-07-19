package edu.ciet.erp.repository;

import edu.ciet.erp.model.Research;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface ResearchRepository extends MongoRepository<Research, String> {
    List<Research> findAllByRollNoIgnoreCase(String rollNo);
}
