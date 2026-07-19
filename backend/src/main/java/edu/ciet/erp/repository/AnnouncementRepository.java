package edu.ciet.erp.repository;

import edu.ciet.erp.model.Announcement;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface AnnouncementRepository extends MongoRepository<Announcement, String> {
    List<Announcement> findAllByDepartmentId(String departmentId);
}
