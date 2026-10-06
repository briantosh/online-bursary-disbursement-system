CREATE TABLE IF NOT EXISTS student_registry (
    admission_number VARCHAR(32) NOT NULL PRIMARY KEY,
    full_name VARCHAR(160) NOT NULL,
    email VARCHAR(254) NOT NULL,
    course VARCHAR(160) NOT NULL,
    status ENUM('enrolled', 'graduated', 'withdrawn') NOT NULL DEFAULT 'enrolled',
    imported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY student_registry_email_idx (email)
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) NOT NULL PRIMARY KEY,
    full_name VARCHAR(160) NOT NULL,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'bursary_officer', 'admin') NOT NULL,
    status ENUM('active', 'pending', 'suspended') NOT NULL DEFAULT 'active',
    admission_number VARCHAR(32) NULL,
    course VARCHAR(160) NULL,
    year_of_study VARCHAR(32) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY users_email_unique (email),
    UNIQUE KEY users_admission_number_unique (admission_number),
    KEY users_role_status_idx (role, status),
    CONSTRAINT users_student_registry_fk FOREIGN KEY (admission_number)
        REFERENCES student_registry (admission_number),
    CONSTRAINT student_profile_required CHECK (
        role <> 'student' OR (admission_number IS NOT NULL AND course IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;