package edu.ciet.erp.repository;

import edu.ciet.erp.model.Event;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface EventRepository extends MongoRepository<Event, String> {
    List<Event> findAllByRollNoIgnoreCase(String rollNo);
}
