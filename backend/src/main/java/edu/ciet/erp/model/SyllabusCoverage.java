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
@Document(collection = "syllabus_coverage")
public class SyllabusCoverage {
    @Id
    private String id;

    private String subjectCode;
    private String subjectName;

    @Indexed
    private String departmentId;

    private int totalTopics;
    private int coveredTopics;

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
