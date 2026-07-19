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
@Document(collection = "semester_results")
public class SemesterResult {
    @Id
    private String id;
    
    @Indexed
    private String rollNo;
    
    private String semester;
    private String examName;
    private String subjectCode;
    private String subjectName;
    private double score;
    private double maxScore;
    private String grade;
    
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
