package edu.ciet.erp.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "accreditation_checklist")
public class AccreditationChecklist {
    @Id
    private String id;

    private String criterionName;
    private double completionPercentage;
    
    @Builder.Default
    private List<String> uploadedEvidenceUrls = new ArrayList<>();
    
    private boolean isCompleted;

    @Indexed
    private String departmentId;
}
