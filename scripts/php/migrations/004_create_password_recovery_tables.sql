CREATE TABLE IF NOT EXISTS user_infomation (
    user_id INT UNSIGNED NOT NULL,
    security_question INT UNSIGNED NOT NULL,
    security_answer VARCHAR(255) NOT NULL,
    PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_limits (
    user_id INT UNSIGNED NOT NULL,
    last_reset_at DATETIME NULL,
    PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_attempts (
    account_key CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    attempt_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
    attempt_date DATE NOT NULL,
    PRIMARY KEY (account_key),
    KEY idx_password_reset_attempts_date (attempt_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
