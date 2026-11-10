CREATE TABLE login_attempts (
    username_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    ip_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    attempt_count INT UNSIGNED NOT NULL,
    window_started_at DATETIME NOT NULL,
    PRIMARY KEY (username_hash, ip_hash),
    KEY idx_login_attempts_window_started_at (window_started_at)
) ENGINE=InnoDB;
