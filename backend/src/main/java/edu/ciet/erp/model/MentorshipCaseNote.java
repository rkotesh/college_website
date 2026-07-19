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
@Document(collection = "mentorship_case_notes")
public class MentorshipCaseNote {
    @Id
    private String id;

    @Indexed
    private String rollNo;

    private String authorUserId;
    private String authorRole;
    private String content;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
