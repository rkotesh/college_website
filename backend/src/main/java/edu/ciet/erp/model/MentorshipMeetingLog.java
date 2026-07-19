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
@Document(collection = "mentorship_meeting_logs")
public class MentorshipMeetingLog {
    @Id
    private String id;

    @Indexed
    private String rollNo;

    @Indexed
    private String mentorUserId;

    private LocalDate meetingDate;
    private String topicsDiscussed;
    private String concerns;
    private String followUpAction;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
