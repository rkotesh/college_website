package edu.ciet.erp.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "academic_documents")
public class AcademicDocument {
    @Id
    private String id;

    private String title;
    private String docType; // LESSON_PLAN, TIMETABLE, CALENDAR
    private String fileUrl;
    private String resourceUrl;
    private String subjectCode;
    private String semester;
    private String academicYear;
    private String targetYear;
    private String targetSection;

    @Indexed
    private String departmentId;

    private LocalDate validFrom;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
