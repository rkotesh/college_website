package edu.ciet.erp.repository;

import edu.ciet.erp.model.Course;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface CourseRepository extends MongoRepository<Course, String> {
    List<Course> findAllByRollNoIgnoreCase(String rollNo);
}
