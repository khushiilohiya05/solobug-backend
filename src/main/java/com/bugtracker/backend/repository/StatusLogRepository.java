package com.bugtracker.backend.repository;

import com.bugtracker.backend.entity.StatusLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StatusLogRepository extends JpaRepository<StatusLog, Long> {
    List<StatusLog> findByBugIdOrderByChangedAtDesc(Long bugId);
}