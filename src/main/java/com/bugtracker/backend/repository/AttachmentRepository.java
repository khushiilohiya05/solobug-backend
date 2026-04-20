package com.bugtracker.backend.repository;

import com.bugtracker.backend.entity.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AttachmentRepository extends JpaRepository<Attachment, Long> {
    List<Attachment> findByBugIdOrderByUploadedAtDesc(Long bugId);
    Optional<Attachment> findFirstByBugIdOrderByUploadedAtDesc(Long bugId);
}