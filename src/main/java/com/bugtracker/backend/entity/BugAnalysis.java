package com.bugtracker.backend.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "bug_analysis")
public class BugAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "detected_issue", columnDefinition = "TEXT")
    private String detectedIssue;

    @Column(name = "confidence")
    private String confidence;

    @Column(name = "probable_cause", columnDefinition = "TEXT")
    private String probableCause;

    @Column(name = "fix_suggestion", columnDefinition = "TEXT")
    private String fixSuggestion;

    @Column(name = "improved_code", columnDefinition = "LONGTEXT")
    private String improvedCode;

    @Column(name = "screenshot_context", columnDefinition = "TEXT")
    private String screenshotContext;

    @Column(name = "analyzed_at")
    private LocalDateTime analyzedAt;

    @OneToOne
    @JoinColumn(name = "bug_id", nullable = false, unique = true)
    @JsonBackReference
    private Bug bug;

    public BugAnalysis() {
    }

    @PrePersist
    @PreUpdate
    public void prePersist() {
        this.analyzedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getDetectedIssue() {
        return detectedIssue;
    }

    public void setDetectedIssue(String detectedIssue) {
        this.detectedIssue = detectedIssue;
    }

    public String getConfidence() {
        return confidence;
    }

    public void setConfidence(String confidence) {
        this.confidence = confidence;
    }

    public String getProbableCause() {
        return probableCause;
    }

    public void setProbableCause(String probableCause) {
        this.probableCause = probableCause;
    }

    public String getFixSuggestion() {
        return fixSuggestion;
    }

    public void setFixSuggestion(String fixSuggestion) {
        this.fixSuggestion = fixSuggestion;
    }

    public String getImprovedCode() {
        return improvedCode;
    }

    public void setImprovedCode(String improvedCode) {
        this.improvedCode = improvedCode;
    }

    public String getScreenshotContext() {
        return screenshotContext;
    }

    public void setScreenshotContext(String screenshotContext) {
        this.screenshotContext = screenshotContext;
    }

    public LocalDateTime getAnalyzedAt() {
        return analyzedAt;
    }

    public Bug getBug() {
        return bug;
    }

    public void setBug(Bug bug) {
        this.bug = bug;
    }
}