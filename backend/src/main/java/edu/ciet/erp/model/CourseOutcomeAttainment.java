package edu.ciet.erp.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "course_outcome_attainment")
public class CourseOutcomeAttainment {
    @Id
    private String id;

    @Indexed
    private String subjectCode;
    
    private String coNumber; // CO1, CO2, etc.
    private Map<String, Integer> mappedPos; // e.g. {"PO1": 3, "PO2": 2}
    private double directAttainment;
    private double indirectAttainment;
    private double attainmentVal;

    @Indexed
    private String departmentId;
}
