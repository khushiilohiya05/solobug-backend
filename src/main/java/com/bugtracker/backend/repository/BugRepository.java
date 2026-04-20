package com.bugtracker.backend.repository;

import com.bugtracker.backend.entity.Bug;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BugRepository extends JpaRepository<Bug, Long> {
    List<Bug> findByProjectIdOrderByCreatedAtDesc(Long projectId);
    List<Bug> findByProjectUserIdOrderByCreatedAtDesc(Long userId);
    long countByProjectUserId(Long userId);
    long countByProjectUserIdAndStatusIgnoreCase(Long userId, String status);
    long countByProjectUserIdAndSeverityIgnoreCase(Long userId, String severity);

    List<Bug> findByProjectId(Long projectId);
}