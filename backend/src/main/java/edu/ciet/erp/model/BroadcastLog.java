package edu.ciet.erp.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "broadcast_logs")
public class BroadcastLog {
    @Id
    private String id;

    @Indexed
    private String senderId;
    
    private String senderName;
    private String senderRole;
    
    private String title;
    private String message;
    
    private List<String> targetRoles;
    private String targetDepartment;
    private String targetYear;
    private String targetSection;
    private String specificTarget;
    
    private int recipientCount;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
