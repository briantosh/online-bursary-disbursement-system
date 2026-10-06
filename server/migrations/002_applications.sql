CREATE TABLE IF NOT EXISTS bursary_applications (
    id CHAR(36) NOT NULL PRIMARY KEY,
    reference VARCHAR(32) NOT NULL UNIQUE,
    student_id CHAR(36) NOT NULL,
    bursary_type VARCHAR(80) NOT NULL,
    requested_amount DECIMAL(10, 2) NOT NULL,
    statement TEXT NOT NULL,
    status ENUM('submitted', 'under_review', 'needs_information', 'approved', 'rejected') NOT NULL DEFAULT 'submitted',
    review_note TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY applications_student_created_idx (student_id, created_at),
    KEY applications_status_created_idx (status, created_at),
    CONSTRAINT bursary_applications_student_fk FOREIGN KEY (student_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS application_documents (
    id CHAR(36) NOT NULL PRIMARY KEY,
    application_id CHAR(36) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT UNSIGNED NOT NULL,
    document_data LONGBLOB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY application_documents_application_unique (application_id),
    CONSTRAINT application_documents_application_fk FOREIGN KEY (application_id)
        REFERENCES bursary_applications (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;