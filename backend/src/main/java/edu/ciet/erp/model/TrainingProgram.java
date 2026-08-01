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
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "training_programs")
public class TrainingProgram {
    @Id
    private String id;

    private String title;
    private String description;
    private LocalDate startDate;
    private LocalDate endDate;
    private String venue;
    private String registrationUrl;
    
    @Builder.Default
    private boolean isActive = true;
    
    private String category; // Aptitude, Technical, Soft Skills, Course, Training, Workshop, Event, etc.

    @Indexed
    private String departmentId;

    @Builder.Default
    private List<String> targetYears = new ArrayList<>();

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
