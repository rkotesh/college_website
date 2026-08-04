package edu.ciet.erp.repository;

import edu.ciet.erp.model.EscalationThread;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface EscalationThreadRepository extends MongoRepository<EscalationThread, String> {
    Optional<EscalationThread> findByRollNoIgnoreCaseAndSubjectCode(String rollNo, String subjectCode);
    Optional<EscalationThread> findByRollNoIgnoreCase(String rollNo);
    List<EscalationThread> findAllByRollNoIgnoreCase(String rollNo);
    /** Find threads where the given mentorId is in the mentorUserIds list */
    List<EscalationThread> findAllByMentorUserIdsIn(List<String> mentorUserIds);
    /** Find threads where the given facultyId is in the facultyUserIds list */
    List<EscalationThread> findAllByFacultyUserIdsIn(List<String> facultyUserIds);
    /** Find threads where the given HOD userId is in the hodUserIds list */
    List<EscalationThread> findAllByHodUserIdsIn(List<String> hodUserIds);
    List<EscalationThread> findAllByIsEscalatedToHOD(boolean isEscalatedToHOD);
    /** Find threads where a roll number is in the rollNos list */
    List<EscalationThread> findAllByRollNosContaining(String rollNo);
    /** Find threads created by a specific user */
    List<EscalationThread> findAllByCreatedByUserId(String createdByUserId);
}
