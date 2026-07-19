package edu.ciet.erp.repository;

import edu.ciet.erp.model.SemesterResult;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SemesterResultRepository extends MongoRepository<SemesterResult, String> {
    List<SemesterResult> findAllByRollNoIgnoreCase(String rollNo);
}
