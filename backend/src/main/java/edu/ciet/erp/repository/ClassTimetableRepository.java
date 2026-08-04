package edu.ciet.erp.repository;

import edu.ciet.erp.model.ClassTimetable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClassTimetableRepository extends MongoRepository<ClassTimetable, String> {
    List<ClassTimetable> findByDepartmentId(String departmentId);
    List<ClassTimetable> findByDepartmentIdAndYearAndSectionId(String departmentId, String year, String sectionId);
}
