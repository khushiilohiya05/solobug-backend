package com.bugtracker.backend.controller;

import com.bugtracker.backend.dto.ProjectRequestDto;
import com.bugtracker.backend.entity.Project;
import com.bugtracker.backend.entity.User;
import com.bugtracker.backend.repository.ProjectRepository;
import com.bugtracker.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/projects")
@CrossOrigin(origins = "*")
public class ProjectController {

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private UserRepository userRepository;

    @PostMapping
    public ResponseEntity<?> createProject(@RequestBody ProjectRequestDto projectRequest) {

        if (projectRequest.getTitle() == null || projectRequest.getTitle().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Project title is required");
        }

        if (projectRequest.getUserId() == null) {
            return ResponseEntity.badRequest().body("User ID is required");
        }

        Optional<User> userOptional = userRepository.findById(projectRequest.getUserId());

        if (userOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }

        Project project = new Project();
        project.setTitle(projectRequest.getTitle());
        project.setDescription(projectRequest.getDescription());
        project.setTechStack(projectRequest.getTechStack());
        project.setUser(userOptional.get());

        projectRepository.save(project);

        return ResponseEntity.status(HttpStatus.CREATED).body("Project created successfully");
    }

    @PutMapping("/{projectId}")
    public ResponseEntity<?> updateProject(
            @PathVariable Long projectId,
            @RequestBody Map<String, String> request
    ) {
        Optional<Project> projectOptional = projectRepository.findById(projectId);

        if (projectOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Project not found");
        }

        String title = request.get("title");
        String description = request.get("description");
        String techStack = request.get("techStack");

        if (title == null || title.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Project title is required");
        }

        Project project = projectOptional.get();
        project.setTitle(title);
        project.setDescription(description);
        project.setTechStack(techStack);

        projectRepository.save(project);

        return ResponseEntity.ok("Project updated successfully");
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<?> getProjectById(@PathVariable Long projectId) {
        Optional<Project> projectOptional = projectRepository.findById(projectId);

        if (projectOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Project not found");
        }

        return ResponseEntity.ok(projectOptional.get());
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getProjectsByUser(@PathVariable Long userId) {
        List<Project> projects = projectRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return ResponseEntity.ok(projects);
    }

    @DeleteMapping("/{projectId}")
    public ResponseEntity<?> deleteProject(@PathVariable Long projectId) {
        Optional<Project> projectOptional = projectRepository.findById(projectId);

        if (projectOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Project not found");
        }

        projectRepository.deleteById(projectId);
        return ResponseEntity.ok("Project deleted successfully");
    }
}