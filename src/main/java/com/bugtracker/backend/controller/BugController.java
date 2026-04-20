package com.bugtracker.backend.controller;

import com.bugtracker.backend.dto.BugCreateResponseDto;
import com.bugtracker.backend.entity.Attachment;
import com.bugtracker.backend.entity.Bug;
import com.bugtracker.backend.entity.BugAnalysis;
import com.bugtracker.backend.entity.Project;
import com.bugtracker.backend.entity.StatusLog;
import com.bugtracker.backend.repository.AttachmentRepository;
import com.bugtracker.backend.repository.BugAnalysisRepository;
import com.bugtracker.backend.repository.BugRepository;
import com.bugtracker.backend.repository.ProjectRepository;
import com.bugtracker.backend.repository.StatusLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.transaction.Transactional;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

@RestController
@RequestMapping("/api/bugs")
@CrossOrigin(origins = "*")
public class BugController {

    @Autowired
    private BugRepository bugRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private AttachmentRepository attachmentRepository;

    @Autowired
    private StatusLogRepository statusLogRepository;

    @Autowired
    private BugAnalysisRepository bugAnalysisRepository;

    @Value("${file.upload-dir}")
    private String uploadDir;

    private static final Set<String> ALLOWED_SEVERITIES = Set.of("Low", "Medium", "Critical");
    private static final Set<String> ALLOWED_STATUSES = Set.of("Open", "In Progress", "Resolved");

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createBug(
            @RequestParam String title,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String stepsToReproduce,
            @RequestParam(required = false) String codeSnippet,
            @RequestParam(required = false) String terminalMessage,
            @RequestParam String severity,
            @RequestParam String status,
            @RequestParam Long projectId,
            @RequestParam(required = false) MultipartFile screenshot
    ) {

        if (title == null || title.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Bug title is required");
        }

        if (projectId == null) {
            return ResponseEntity.badRequest().body("Project ID is required");
        }

        if (severity == null || !ALLOWED_SEVERITIES.contains(severity)) {
            return ResponseEntity.badRequest().body("Severity must be Low, Medium, or Critical");
        }

        if (status == null || status.trim().isEmpty()) {
            status = "Open";
        }

        if (!ALLOWED_STATUSES.contains(status)) {
            return ResponseEntity.badRequest().body("Status must be Open, In Progress, or Resolved");
        }

        Optional<Project> projectOptional = projectRepository.findById(projectId);
        if (projectOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Project not found");
        }

        String combinedText = (
                safe(title) + " " +
                safe(description) + " " +
                safe(stepsToReproduce) + " " +
                safe(terminalMessage)
        ).toLowerCase();

        String suggestedSeverity = detectSuggestedSeverity(combinedText);
        String analysisNote = buildAnalysisNote(combinedText, suggestedSeverity);

        List<Bug> projectBugs = bugRepository.findByProjectId(projectId);
        String duplicateTitle = findPossibleDuplicate(projectBugs, title, description);
        boolean possibleDuplicate = duplicateTitle != null;

        String codeAnalysis = analyzeCodeSnippet(safe(codeSnippet));

        Bug bug = new Bug();
        bug.setTitle(title);
        bug.setDescription(description);
        bug.setStepsToReproduce(stepsToReproduce);
        bug.setCodeSnippet(codeSnippet);
        bug.setTerminalMessage(terminalMessage);
        bug.setSeverity(severity);
        bug.setStatus(status);
        bug.setProject(projectOptional.get());

        Bug savedBug = bugRepository.save(bug);

        StatusLog createdLog = new StatusLog();
        createdLog.setOldStatus(null);
        createdLog.setNewStatus(status);
        createdLog.setBug(savedBug);
        statusLogRepository.save(createdLog);

        if (screenshot != null && !screenshot.isEmpty()) {
            try {
                saveAttachmentForBug(savedBug, screenshot);
            } catch (IOException e) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body("Bug created, but screenshot upload failed");
            }
        }

        BugAnalysis analysis = upsertBugAnalysis(savedBug, screenshot);

        BugCreateResponseDto response = new BugCreateResponseDto(
                "Bug created successfully",
                suggestedSeverity,
                possibleDuplicate,
                duplicateTitle,
                analysisNote,
                codeAnalysis,
                analysis.getDetectedIssue(),
                analysis.getConfidence(),
                analysis.getProbableCause(),
                analysis.getFixSuggestion(),
                analysis.getImprovedCode(),
                analysis.getScreenshotContext()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping(value = "/{bugId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateBug(
            @PathVariable Long bugId,
            @RequestParam String title,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String stepsToReproduce,
            @RequestParam(required = false) String codeSnippet,
            @RequestParam(required = false) String terminalMessage,
            @RequestParam String severity,
            @RequestParam(required = false, defaultValue = "false") boolean removeScreenshot,
            @RequestParam(required = false) MultipartFile screenshot
    ) {
        Optional<Bug> bugOptional = bugRepository.findById(bugId);

        if (bugOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Bug not found");
        }

        if (title == null || title.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Bug title is required");
        }

        if (severity == null || !ALLOWED_SEVERITIES.contains(severity)) {
            return ResponseEntity.badRequest().body("Severity must be Low, Medium, or Critical");
        }

        Bug bug = bugOptional.get();
        bug.setTitle(title);
        bug.setDescription(description);
        bug.setStepsToReproduce(stepsToReproduce);
        bug.setSeverity(severity);
        bug.setCodeSnippet(codeSnippet);
        bug.setTerminalMessage(terminalMessage);

        bugRepository.save(bug);

        try {
            if (removeScreenshot) {
                deleteExistingAttachmentsIfAny(bugId);
            }

            if (screenshot != null && !screenshot.isEmpty()) {
                deleteExistingAttachmentsIfAny(bugId);
                saveAttachmentForBug(bug, screenshot);
            }
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Bug updated, but screenshot handling failed");
        }

        upsertBugAnalysis(bug, screenshot);

        return ResponseEntity.ok("Bug updated successfully");
    }

    @GetMapping("/{bugId}")
    public ResponseEntity<?> getBugById(@PathVariable Long bugId) {
        Optional<Bug> bugOptional = bugRepository.findById(bugId);

        if (bugOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Bug not found");
        }

        Bug bug = bugOptional.get();

        if (bug.getAnalysis() == null) {
            upsertBugAnalysis(bug, null);
            bug = bugRepository.findById(bugId).orElse(bug);
        }

        return ResponseEntity.ok(bug);
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<?> getBugsByProject(@PathVariable Long projectId) {
        List<Bug> bugs = bugRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
        return ResponseEntity.ok(bugs);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getBugsByUser(@PathVariable Long userId) {
        List<Bug> bugs = bugRepository.findByProjectUserIdOrderByCreatedAtDesc(userId);
        return ResponseEntity.ok(bugs);
    }

    @GetMapping("/counts/{userId}")
    public ResponseEntity<?> getBugCounts(@PathVariable Long userId) {
        long totalBugs = bugRepository.countByProjectUserId(userId);
        long openBugs = bugRepository.countByProjectUserIdAndStatusIgnoreCase(userId, "Open");
        long criticalBugs = bugRepository.countByProjectUserIdAndSeverityIgnoreCase(userId, "Critical");
        long resolvedBugs = bugRepository.countByProjectUserIdAndStatusIgnoreCase(userId, "Resolved");

        return ResponseEntity.ok(new BugCountsResponse(totalBugs, openBugs, criticalBugs, resolvedBugs));
    }

    @GetMapping("/{bugId}/status-logs")
    public ResponseEntity<?> getStatusLogs(@PathVariable Long bugId) {
        List<StatusLog> logs = statusLogRepository.findByBugIdOrderByChangedAtDesc(bugId);
        return ResponseEntity.ok(logs);
    }

    @PutMapping("/{bugId}/status")
    public ResponseEntity<?> updateBugStatus(@PathVariable Long bugId, @RequestParam String status) {
        if (!ALLOWED_STATUSES.contains(status)) {
            return ResponseEntity.badRequest().body("Status must be Open, In Progress, or Resolved");
        }

        Optional<Bug> bugOptional = bugRepository.findById(bugId);
        if (bugOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Bug not found");
        }

        Bug bug = bugOptional.get();
        String oldStatus = bug.getStatus();

        if (oldStatus.equals(status)) {
            return ResponseEntity.ok("Bug status unchanged");
        }

        bug.setStatus(status);
        bugRepository.save(bug);

        StatusLog statusLog = new StatusLog();
        statusLog.setOldStatus(oldStatus);
        statusLog.setNewStatus(status);
        statusLog.setBug(bug);
        statusLogRepository.save(statusLog);

        upsertBugAnalysis(bug, null);

        return ResponseEntity.ok("Bug status updated successfully");
    }

    @Transactional
    @DeleteMapping("/{bugId}")
    public ResponseEntity<?> deleteBug(@PathVariable Long bugId) {
        Optional<Bug> bugOptional = bugRepository.findById(bugId);

        if (bugOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Bug not found");
        }

        Bug bug = bugOptional.get();

        try {
            deleteExistingAttachmentsIfAny(bugId);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Could not clean up bug screenshot");
        }

        List<StatusLog> logs = statusLogRepository.findByBugIdOrderByChangedAtDesc(bugId);
        if (!logs.isEmpty()) {
            statusLogRepository.deleteAll(logs);
        }

        Optional<BugAnalysis> analysisOptional = bugAnalysisRepository.findByBugId(bugId);
        if (analysisOptional.isPresent()) {
            BugAnalysis analysis = analysisOptional.get();
            analysis.setBug(null);
            bugAnalysisRepository.delete(analysis);
        }

        bug.setAnalysis(null);
        bugRepository.save(bug);

        bugRepository.delete(bug);

        return ResponseEntity.ok("Bug deleted successfully");
    }

    private void saveAttachmentForBug(Bug bug, MultipartFile screenshot) throws IOException {
        String originalFileName = StringUtils.cleanPath(Objects.requireNonNull(screenshot.getOriginalFilename()));
        String uniqueFileName = UUID.randomUUID() + "_" + originalFileName;

        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        Path filePath = uploadPath.resolve(uniqueFileName);
        screenshot.transferTo(filePath.toFile());

        Attachment attachment = new Attachment();
        attachment.setFileName(originalFileName);
        attachment.setFilePath(uniqueFileName);
        attachment.setFileType(screenshot.getContentType());
        attachment.setBug(bug);

        attachmentRepository.save(attachment);
    }

    private void deleteExistingAttachmentsIfAny(Long bugId) throws IOException {
        List<Attachment> attachments = attachmentRepository.findByBugIdOrderByUploadedAtDesc(bugId);

        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();

        for (Attachment attachment : attachments) {
            Path storedFilePath = uploadPath.resolve(attachment.getFilePath()).normalize();
            if (Files.exists(storedFilePath)) {
                Files.delete(storedFilePath);
            }
            attachmentRepository.delete(attachment);
        }
    }

    private String detectSuggestedSeverity(String text) {
        if (containsAny(text, "crash", "payment failed", "data loss", "security", "login failed", "server down", "fatal", "exception", "500", "cannot connect")) {
            return "Critical";
        }
        if (containsAny(text, "slow", "broken", "not loading", "incorrect", "error", "issue", "failed", "warning")) {
            return "Medium";
        }
        return "Low";
    }

    private String buildAnalysisNote(String text, String suggestedSeverity) {
        if ("Critical".equals(suggestedSeverity)) {
            return "Suggested severity is Critical because the bug details indicate a crash, backend failure, severe blocking issue, or security/data risk.";
        }
        if ("Medium".equals(suggestedSeverity)) {
            return "Suggested severity is Medium because the issue looks functional and impacts usability, but it does not appear fully system-breaking.";
        }
        return "Suggested severity is Low because the issue looks minor, cosmetic, or limited in impact.";
    }

    private String findPossibleDuplicate(List<Bug> existingBugs, String newTitle, String newDescription) {
        String baseTitle = safe(newTitle).trim().toLowerCase();
        String baseDescription = safe(newDescription).trim().toLowerCase();

        for (Bug existingBug : existingBugs) {
            String existingTitle = safe(existingBug.getTitle()).trim().toLowerCase();
            String existingDescription = safe(existingBug.getDescription()).trim().toLowerCase();

            if (existingTitle.equals(baseTitle)
                    || existingTitle.contains(baseTitle)
                    || baseTitle.contains(existingTitle)) {
                return existingBug.getTitle();
            }

            int titleMatchScore = countCommonKeywords(baseTitle, existingTitle);
            int descriptionMatchScore = countCommonKeywords(baseDescription, existingDescription);

            if (titleMatchScore >= 2 || (titleMatchScore >= 1 && descriptionMatchScore >= 2)) {
                return existingBug.getTitle();
            }
        }

        return null;
    }

    private int countCommonKeywords(String a, String b) {
        if (a.isBlank() || b.isBlank()) return 0;

        Set<String> aWords = new HashSet<>(Arrays.asList(a.split("\\s+")));
        Set<String> bWords = new HashSet<>(Arrays.asList(b.split("\\s+")));
        aWords.retainAll(bWords);
        aWords.removeIf(word -> word.length() <= 2);

        return aWords.size();
    }

    private String analyzeCodeSnippet(String code) {
        if (code == null || code.isBlank()) {
            return "No code snippet provided.";
        }

        String lowerCode = code.toLowerCase();
        List<String> findings = new ArrayList<>();

        if (lowerCode.contains("select * from") || lowerCode.contains("query = \"select") || lowerCode.contains("+ request.getparameter")) {
            findings.add("Possible SQL injection or unsafe query construction detected.");
        }

        if (lowerCode.contains("null") || lowerCode.contains(".get(") || lowerCode.contains(".getattribute(")) {
            findings.add("Possible null-handling risk detected. Add null checks before access.");
        }

        if (lowerCode.contains("password") || lowerCode.contains("token") || lowerCode.contains("session")) {
            findings.add("Authentication or session-sensitive code detected. Review security handling carefully.");
        }

        if (lowerCode.contains("catch (exception") && !lowerCode.contains("log") && !lowerCode.contains("printstacktrace")) {
            findings.add("Exception handling may be too silent. Consider better logging or clearer error visibility.");
        }

        if (lowerCode.contains("input") && !lowerCode.contains("validate") && !lowerCode.contains("@valid")) {
            findings.add("Possible missing validation for incoming input.");
        }

        if (lowerCode.contains("arrayindexoutofbound") || lowerCode.contains("substring(") || lowerCode.contains("charat(")) {
            findings.add("Possible boundary or index safety risk detected.");
        }

        if (findings.isEmpty()) {
            return "No strong code risk pattern detected from the provided snippet, but manual review is still recommended.";
        }

        return String.join(" ", findings);
    }

    private BugAnalysis upsertBugAnalysis(Bug bug, MultipartFile uploadedScreenshot) {
        BugAnalysis analysis = bugAnalysisRepository.findByBugId(bug.getId()).orElse(new BugAnalysis());

        String title = safe(bug.getTitle());
        String description = safe(bug.getDescription());
        String steps = safe(bug.getStepsToReproduce());
        String terminalMessage = safe(bug.getTerminalMessage());
        String codeSnippet = safe(bug.getCodeSnippet());

        String screenshotContext = detectScreenshotContext(bug, uploadedScreenshot);
        String allText = (title + " " + description + " " + steps + " " + terminalMessage + " " + codeSnippet + " " + screenshotContext).toLowerCase();

        String detectedIssue = detectIssue(allText);
        String confidence = detectConfidence(allText, codeSnippet, terminalMessage, screenshotContext);
        String probableCause = detectProbableCause(detectedIssue, allText);
        String fixSuggestion = detectFixSuggestion(detectedIssue);
        String improvedCode = buildImprovedCode(codeSnippet, detectedIssue, probableCause, fixSuggestion);

        analysis.setBug(bug);
        analysis.setDetectedIssue(detectedIssue);
        analysis.setConfidence(confidence);
        analysis.setProbableCause(probableCause);
        analysis.setFixSuggestion(fixSuggestion);
        analysis.setImprovedCode(improvedCode);
        analysis.setScreenshotContext(screenshotContext);

        BugAnalysis saved = bugAnalysisRepository.save(analysis);
        bug.setAnalysis(saved);
        bugRepository.save(bug);

        return saved;
    }

    private String detectScreenshotContext(Bug bug, MultipartFile uploadedScreenshot) {
        if (uploadedScreenshot != null && !uploadedScreenshot.isEmpty()) {
            String fileName = safe(uploadedScreenshot.getOriginalFilename()).toLowerCase();
            return buildScreenshotContextFromFileName(fileName);
        }

        List<Attachment> attachments = attachmentRepository.findByBugIdOrderByUploadedAtDesc(bug.getId());
        if (!attachments.isEmpty()) {
            String fileName = safe(attachments.get(0).getFileName()).toLowerCase();
            return buildScreenshotContextFromFileName(fileName);
        }

        return "No screenshot provided.";
    }

    private String buildScreenshotContextFromFileName(String fileName) {
        if (fileName.isBlank()) {
            return "Screenshot uploaded, but no useful filename context found.";
        }

        if (containsAny(fileName, "console", "terminal", "cmd", "error", "exception", "stacktrace", "build", "compile")) {
            return "Screenshot filename suggests terminal/console or error output context.";
        }

        if (containsAny(fileName, "ui", "layout", "screen", "page", "dashboard", "button", "form")) {
            return "Screenshot filename suggests UI or layout context.";
        }

        return "Screenshot uploaded. Basic context is available from filename only.";
    }

    private String detectIssue(String text) {
        if (containsAny(text, "nullpointerexception", "cannot invoke", "cannot read properties of null", "cannot read properties of undefined", "null reference")) {
            return "Null reference or missing object/value";
        }
        if (containsAny(text, "syntaxerror", "unexpected token", "missing ;", "missing )", "compile error", "compilation failed")) {
            return "Syntax or compilation error";
        }
        if (containsAny(text, "sql", "jdbc", "constraintviolation", "duplicate entry", "table", "column", "database", "datasource", "connection refused")) {
            return "Database query or connection issue";
        }
        if (containsAny(text, "401", "403", "unauthorized", "forbidden", "token", "jwt", "login failed", "access denied")) {
            return "Authentication or authorization issue";
        }
        if (containsAny(text, "404", "500", "fetch", "network", "cors", "failed to fetch", "api", "endpoint")) {
            return "API, backend, or network integration issue";
        }
        if (containsAny(text, "arrayindexoutofboundsexception", "index out of bounds", "substring", "charat", "length")) {
            return "Index or boundary handling issue";
        }
        if (containsAny(text, "button not working", "not responding", "not loading", "layout", "alignment", "ui", "screen")) {
            return "UI behavior or rendering issue";
        }
        if (containsAny(text, "upload", "multipart", "file", "image", "screenshot")) {
            return "File upload or file handling issue";
        }
        return "General logic or implementation issue";
    }

    private String detectConfidence(String allText, String codeSnippet, String terminalMessage, String screenshotContext) {
        int score = 0;

        if (!terminalMessage.isBlank()) score += 2;
        if (!codeSnippet.isBlank()) score += 2;
        if (!screenshotContext.equals("No screenshot provided.")) score += 1;

        if (containsAny(allText,
                "nullpointerexception", "syntaxerror", "unexpected token", "401", "403", "404", "500",
                "failed to fetch", "duplicate entry", "constraintviolation", "connection refused",
                "access denied", "compilation failed")) {
            score += 2;
        }

        if (score >= 5) return "High";
        if (score >= 3) return "Medium";
        return "Low";
    }

    private String detectProbableCause(String detectedIssue, String text) {
        switch (detectedIssue) {
            case "Null reference or missing object/value":
                return "A variable, response object, DOM element, or backend value is being used before confirming that it exists.";
            case "Syntax or compilation error":
                return "There is likely a code syntax mistake such as a missing bracket, semicolon, import, incorrect token, or invalid statement structure.";
            case "Database query or connection issue":
                return "The query, schema mapping, table/column definition, credentials, or DB connection configuration is inconsistent with the code flow.";
            case "Authentication or authorization issue":
                return "The request is missing valid credentials, using the wrong token/session flow, or reaching a protected resource without proper access.";
            case "API, backend, or network integration issue":
                return "The frontend request, backend endpoint, request method, port, CORS setup, or response handling is mismatched or failing.";
            case "Index or boundary handling issue":
                return "The code is trying to access an array/string/list position that is outside the valid range.";
            case "UI behavior or rendering issue":
                return "The UI event binding, state update, DOM selection, CSS layout rule, or render condition is not matching the expected behavior.";
            case "File upload or file handling issue":
                return "The multipart request, file path handling, accepted file type, or backend storage logic is likely not aligned correctly.";
            default:
                return "The bug details suggest a logic mismatch between expected flow and actual implementation, but there is not enough precision for a narrower category.";
        }
    }

    private String detectFixSuggestion(String detectedIssue) {
        switch (detectedIssue) {
            case "Null reference or missing object/value":
                return "Add null/undefined checks before access, validate incoming data earlier, and guard any chained property or method calls.";
            case "Syntax or compilation error":
                return "Review the exact line near the reported error, fix brackets/tokens/imports, and rebuild after correcting the syntax structure.";
            case "Database query or connection issue":
                return "Verify DB URL, table/column names, repository/entity mapping, and use parameterized queries with correct schema alignment.";
            case "Authentication or authorization issue":
                return "Check login flow, token storage, protected route access, request headers, and whether the backend endpoint is intentionally secured.";
            case "API, backend, or network integration issue":
                return "Check endpoint URL, HTTP method, request payload, backend port, CORS configuration, and frontend response parsing.";
            case "Index or boundary handling issue":
                return "Add boundary checks before substring/charAt/index access and validate collection sizes before reading elements.";
            case "UI behavior or rendering issue":
                return "Verify event listeners, button handlers, conditional rendering logic, and CSS/layout rules affecting visibility or interaction.";
            case "File upload or file handling issue":
                return "Validate multipart field names, file existence checks, storage path creation, and ensure the frontend and backend use the same upload key.";
            default:
                return "Review the flow step by step, compare expected vs actual values, and add better validation/logging around the failing section.";
        }
    }

    private String buildImprovedCode(String codeSnippet, String detectedIssue, String probableCause, String fixSuggestion) {
        if (codeSnippet == null || codeSnippet.isBlank()) {
            return "No code snippet provided.";
        }

        StringBuilder improved = new StringBuilder();

        improved.append("/*\n");
        improved.append("Improved Code Guidance\n");
        improved.append("Detected Issue: ").append(detectedIssue).append("\n");
        improved.append("Probable Cause: ").append(probableCause).append("\n");
        improved.append("Fix Suggestion: ").append(fixSuggestion).append("\n");
        improved.append("Note: This output preserves your original code and adds safer guidance so you can update it without losing context.\n");
        improved.append("*/\n\n");

        if ("Null reference or missing object/value".equals(detectedIssue)) {
            improved.append("/* Suggested improvement: add null checks before using values or chained calls. */\n");
        } else if ("Database query or connection issue".equals(detectedIssue)) {
            improved.append("/* Suggested improvement: verify SQL/query construction, entity mapping, and DB config before executing this code. */\n");
        } else if ("Authentication or authorization issue".equals(detectedIssue)) {
            improved.append("/* Suggested improvement: validate auth headers/token/session before protected operations. */\n");
        } else if ("API, backend, or network integration issue".equals(detectedIssue)) {
            improved.append("/* Suggested improvement: check endpoint path, request method, payload shape, and response handling. */\n");
        } else if ("Index or boundary handling issue".equals(detectedIssue)) {
            improved.append("/* Suggested improvement: validate string/list/array length before access. */\n");
        } else if ("Syntax or compilation error".equals(detectedIssue)) {
            improved.append("/* Suggested improvement: review syntax near the failing line and rebuild after correction. */\n");
        } else if ("File upload or file handling issue".equals(detectedIssue)) {
            improved.append("/* Suggested improvement: verify multipart field name, file existence, and storage path logic. */\n");
        } else if ("UI behavior or rendering issue".equals(detectedIssue)) {
            improved.append("/* Suggested improvement: confirm event binding, selectors, and condition-based rendering. */\n");
        } else {
            improved.append("/* Suggested improvement: add validation and logging around the failing section. */\n");
        }

        improved.append("\n");
        improved.append(codeSnippet);

        return improved.toString();
    }

    private boolean containsAny(String text, String... keywords) {
        for (String keyword : keywords) {
            if (text.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    public static class BugCountsResponse {
        private long totalBugs;
        private long openBugs;
        private long criticalBugs;
        private long resolvedBugs;

        public BugCountsResponse(long totalBugs, long openBugs, long criticalBugs, long resolvedBugs) {
            this.totalBugs = totalBugs;
            this.openBugs = openBugs;
            this.criticalBugs = criticalBugs;
            this.resolvedBugs = resolvedBugs;
        }

        public long getTotalBugs() {
            return totalBugs;
        }

        public long getOpenBugs() {
            return openBugs;
        }

        public long getCriticalBugs() {
            return criticalBugs;
        }

        public long getResolvedBugs() {
            return resolvedBugs;
        }
    }
}