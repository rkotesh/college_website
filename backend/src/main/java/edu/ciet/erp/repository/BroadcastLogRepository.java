package edu.ciet.erp.repository;

import edu.ciet.erp.model.BroadcastLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface BroadcastLogRepository extends MongoRepository<BroadcastLog, String> {
    List<BroadcastLog> findAllBySenderIdOrderByCreatedAtDesc(String senderId);
    List<BroadcastLog> findAllByOrderByCreatedAtDesc();
}
