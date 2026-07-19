package edu.ciet.erp.repository;

import edu.ciet.erp.model.MentorshipMeetingLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface MentorshipMeetingLogRepository extends MongoRepository<MentorshipMeetingLog, String> {
    List<MentorshipMeetingLog> findAllByMentorUserId(String mentorUserId);
    List<MentorshipMeetingLog> findAllByRollNoIgnoreCase(String rollNo);
}
