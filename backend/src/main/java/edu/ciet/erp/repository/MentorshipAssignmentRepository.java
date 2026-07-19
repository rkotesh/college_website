package edu.ciet.erp.repository;

import edu.ciet.erp.model.MentorshipAssignment;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface MentorshipAssignmentRepository extends MongoRepository<MentorshipAssignment, String> {
    Optional<MentorshipAssignment> findByRollNoIgnoreCase(String rollNo);
    List<MentorshipAssignment> findAllByMentorUserId(String mentorUserId);
    List<MentorshipAssignment> findAllByDepartmentId(String departmentId);
    List<MentorshipAssignment> findAllByDepartmentIdAndBatchAndSectionId(String departmentId, String batch, String sectionId);
    boolean existsByMentorUserId(String mentorUserId);
}
