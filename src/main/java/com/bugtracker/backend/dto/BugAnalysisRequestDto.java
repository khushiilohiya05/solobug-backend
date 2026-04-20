package com.bugtracker.backend.dto;

public class BugAnalysisRequestDto {

    private String title;
    private String description;
    private String codeSnippet;
    private String terminalMessage;
    private String screenshotFileName;

    public BugAnalysisRequestDto() {
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCodeSnippet() {
        return codeSnippet;
    }

    public void setCodeSnippet(String codeSnippet) {
        this.codeSnippet = codeSnippet;
    }

    public String getTerminalMessage() {
        return terminalMessage;
    }

    public void setTerminalMessage(String terminalMessage) {
        this.terminalMessage = terminalMessage;
    }

    public String getScreenshotFileName() {
        return screenshotFileName;
    }

    public void setScreenshotFileName(String screenshotFileName) {
        this.screenshotFileName = screenshotFileName;
    }
}