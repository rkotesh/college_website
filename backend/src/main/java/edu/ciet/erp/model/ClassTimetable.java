package edu.ciet.erp.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "class_timetables")
public class ClassTimetable {
    @Id
    private String id;

    @Indexed
    private String departmentId;

    private String year;
    private String sectionId;
    private String academicYear;
    
    // e.g., "Monday", "Tuesday", etc.
    private String dayOfWeek;
    
    // e.g., 1, 2, 3 OR time range like "09:00-09:50"
    private String periodNumber;
    
    private String subjectCode;
    
    // The user ID of the faculty assigned to this period
    private String facultyUserId;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
