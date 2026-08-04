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

    /** Free-form group name, like WhatsApp group name */
    private String groupName;

    /** User ID of the person who created this group */
    private String createdByUserId;

    /** Role of the creator (HOD, Faculty, Mentor) */
    private String createdByRole;

    /** Multiple students can be in a group (their roll numbers) */
    @Builder.Default
    private List<String> rollNos = new ArrayList<>();

    /** Legacy single-student field — kept for backward compat */
    @Indexed
    private String rollNo;

    /** Supports multiple mentors per thread */
    @Builder.Default
    private List<String> mentorUserIds = new ArrayList<>();

    /** Supports multiple faculty members per thread */
    @Builder.Default
    private List<String> facultyUserIds = new ArrayList<>();

    /** HOD user IDs explicitly added (includes creator if HOD) */
    @Builder.Default
    private List<String> hodUserIds = new ArrayList<>();

    private String subjectCode;

    @Builder.Default
    private boolean isEscalatedToHOD = false;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
