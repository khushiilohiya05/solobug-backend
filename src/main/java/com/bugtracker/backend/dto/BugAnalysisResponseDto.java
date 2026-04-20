package com.bugtracker.backend.dto;

public class BugAnalysisResponseDto {

    private String detectedIssue;
    private String confidence;
    private String probableCause;
    private String fixSuggestion;
    private String improvedCode;
    private String screenshotContext;

    public BugAnalysisResponseDto() {
    }

    public BugAnalysisResponseDto(
            String detectedIssue,
            String confidence,
            String probableCause,
            String fixSuggestion,
            String improvedCode,
            String screenshotContext
    ) {
        this.detectedIssue = detectedIssue;
        this.confidence = confidence;
        this.probableCause = probableCause;
        this.fixSuggestion = fixSuggestion;
        this.improvedCode = improvedCode;
        this.screenshotContext = screenshotContext;
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
}