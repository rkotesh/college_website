package edu.ciet.erp.repository;

import edu.ciet.erp.model.Project;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface ProjectRepository extends MongoRepository<Project, String> {
    List<Project> findAllByRollNoIgnoreCase(String rollNo);
}
