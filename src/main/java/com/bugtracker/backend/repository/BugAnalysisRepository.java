package com.bugtracker.backend.repository;

import com.bugtracker.backend.entity.BugAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BugAnalysisRepository extends JpaRepository<BugAnalysis, Long> {
    Optional<BugAnalysis> findByBugId(Long bugId);
    void deleteByBugId(Long bugId);
}