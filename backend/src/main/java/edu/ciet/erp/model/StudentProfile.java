package edu.ciet.erp.model;

import com.fasterxml.jackson.annotation.JsonProperty;
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
@Document(collection = "student_profiles")
public class StudentProfile {
    @Id
    private String id;

    @Indexed(unique = true)
    private String userId;

    @Indexed(unique = true)
    private String rollNo;

    private String batch;
    private String departmentId;
    private String sectionId;
    
    @Builder.Default
    private double cgpa = 0.0;
    
    private String resumeUrl;
    private String photoUrl;
    private String profileSummary;
    
    @Builder.Default
    @JsonProperty("isPublic")
    private boolean isPublic = false;
    
    @Indexed(unique = true)
    private String slug;

    // Attendance tracking
    @Builder.Default
    private int totalClasses = 100;
    @Builder.Default
    private int attendedClasses = 82;

    // Coding statistics
    @Builder.Default
    private int leetcodeEasySolved = 15;
    @Builder.Default
    private int leetcodeMediumSolved = 20;
    @Builder.Default
    private int leetcodeHardSolved = 5;
    @Builder.Default
    private int githubReposCount = 12;
    @Builder.Default
    private int githubCommitsCount = 142;

    @Builder.Default
    private int codeforcesRating = 0;
    private String codeforcesRank;
    
    @Builder.Default
    private int codechefRating = 0;
    private String codechefStars;
    
    @Builder.Default
    private int hackerrankBadges = 0;

    // Contact Details
    private String personalEmail;
    private String personalPhone;
    
    @Builder.Default
    @JsonProperty("personalEmailVerified")
    private boolean personalEmailVerified = false;
    
    @Builder.Default
    @JsonProperty("personalPhoneVerified")
    private boolean personalPhoneVerified = false;

    // Social & Professional Profiles
    private String linkedinUrl;
    private String githubUrl;
    private String leetcodeUrl;
    private String hackerrankUrl;
    private String codechefUrl;
    private String codeforcesUrl;
    private String spokenTutorialUrl;
    private String prepinstaUrl;

    // Visibilities on Public Profile
    @Builder.Default @JsonProperty("showEmailOnProfile") private boolean showEmailOnProfile = true;
    @Builder.Default @JsonProperty("showResumeOnProfile") private boolean showResumeOnProfile = true;
    @Builder.Default @JsonProperty("showLinkedinOnProfile") private boolean showLinkedinOnProfile = true;
    @Builder.Default @JsonProperty("showGithubOnProfile") private boolean showGithubOnProfile = true;
    @Builder.Default @JsonProperty("showLeetcodeOnProfile") private boolean showLeetcodeOnProfile = true;
    @Builder.Default @JsonProperty("showHackerrankOnProfile") private boolean showHackerrankOnProfile = true;
    @Builder.Default @JsonProperty("showCodechefOnProfile") private boolean showCodechefOnProfile = true;
    @Builder.Default @JsonProperty("showCodeforcesOnProfile") private boolean showCodeforcesOnProfile = true;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
