package edu.ciet.erp.repository;

import edu.ciet.erp.model.EscalationMessage;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface EscalationMessageRepository extends MongoRepository<EscalationMessage, String> {
    List<EscalationMessage> findAllByThreadIdOrderByCreatedAtAsc(String threadId);
}
