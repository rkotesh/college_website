package edu.ciet.erp.repository;

import edu.ciet.erp.model.MentorshipCaseNote;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface MentorshipCaseNoteRepository extends MongoRepository<MentorshipCaseNote, String> {
    List<MentorshipCaseNote> findAllByRollNoIgnoreCaseOrderByCreatedAtDesc(String rollNo);
}
