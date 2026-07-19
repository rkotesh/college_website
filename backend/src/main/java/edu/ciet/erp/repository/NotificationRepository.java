package edu.ciet.erp.repository;

import edu.ciet.erp.model.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface NotificationRepository extends MongoRepository<Notification, String> {
    List<Notification> findAllByRollNoIgnoreCaseOrderByCreatedAtDesc(String rollNo);
    long countByRollNoIgnoreCaseAndReadFalse(String rollNo);
}
