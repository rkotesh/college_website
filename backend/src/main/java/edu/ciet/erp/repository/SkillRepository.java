package edu.ciet.erp.repository;

import edu.ciet.erp.model.Skill;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface SkillRepository extends MongoRepository<Skill, String> {
    List<Skill> findAllByRollNoIgnoreCase(String rollNo);
}
