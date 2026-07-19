package edu.ciet.erp.repository;

import edu.ciet.erp.model.Message;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface MessageRepository extends MongoRepository<Message, String> {
    List<Message> findAllByStudentRollNoOrderByTimestampAsc(String studentRollNo);
    List<Message> findAllBySenderIdOrRecipientIdOrderByTimestampAsc(String senderId, String recipientId);
}
