package edu.ciet.erp.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "escalation_threads")
public class EscalationThread {
    @Id
    private String id;

    @Indexed
    private String rollNo;

    /** Supports multiple mentors per intervention thread */
    @Builder.Default
    private List<String> mentorUserIds = new ArrayList<>();

    /** Supports multiple faculty members per intervention thread */
    @Builder.Default
    private List<String> facultyUserIds = new ArrayList<>();

    private String subjectCode;

    @Builder.Default
    private boolean isEscalatedToHOD = false;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
