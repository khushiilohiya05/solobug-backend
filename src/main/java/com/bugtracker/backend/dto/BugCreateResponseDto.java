package com.bugtracker.backend.dto;

public class BugCreateResponseDto {

    private String message;
    private String suggestedSeverity;
    private boolean possibleDuplicate;
    private String duplicateTitle;
    private String analysisNote;
    private String codeAnalysis;

    private String detectedIssue;
    private String confidence;
    private String probableCause;
    private String fixSuggestion;
    private String improvedCode;
    private String screenshotContext;

    public BugCreateResponseDto() {
    }

    public BugCreateResponseDto(
            String message,
            String suggestedSeverity,
            boolean possibleDuplicate,
            String duplicateTitle,
            String analysisNote,
            String codeAnalysis,
            String detectedIssue,
            String confidence,
            String probableCause,
            String fixSuggestion,
            String improvedCode,
            String screenshotContext
    ) {
        this.message = message;
        this.suggestedSeverity = suggestedSeverity;
        this.possibleDuplicate = possibleDuplicate;
        this.duplicateTitle = duplicateTitle;
        this.analysisNote = analysisNote;
        this.codeAnalysis = codeAnalysis;
        this.detectedIssue = detectedIssue;
        this.confidence = confidence;
        this.probableCause = probableCause;
        this.fixSuggestion = fixSuggestion;
        this.improvedCode = improvedCode;
        this.screenshotContext = screenshotContext;
    }

    public String getMessage() {
        return message;
    }

    public String getSuggestedSeverity() {
        return suggestedSeverity;
    }

    public boolean isPossibleDuplicate() {
        return possibleDuplicate;
    }

    public String getDuplicateTitle() {
        return duplicateTitle;
    }

    public String getAnalysisNote() {
        return analysisNote;
    }

    public String getCodeAnalysis() {
        return codeAnalysis;
    }

    public String getDetectedIssue() {
        return detectedIssue;
    }

    public String getConfidence() {
        return confidence;
    }

    public String getProbableCause() {
        return probableCause;
    }

    public String getFixSuggestion() {
        return fixSuggestion;
    }

    public String getImprovedCode() {
        return improvedCode;
    }

    public String getScreenshotContext() {
        return screenshotContext;
    }
}