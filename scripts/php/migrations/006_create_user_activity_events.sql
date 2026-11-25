CREATE TABLE IF NOT EXISTS event_lookup (
    event_id INT UNSIGNED NOT NULL,
    event_name VARCHAR(100) NOT NULL,
    PRIMARY KEY (event_id),
    UNIQUE KEY uq_event_lookup_name (event_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO event_lookup (event_id, event_name) VALUES
    (1, 'Authentication'),
    (2, 'Account'),
    (3, 'Session'),
    (4, 'Security')
ON DUPLICATE KEY UPDATE event_name = VALUES(event_name);

CREATE TABLE IF NOT EXISTS user_activity_events (
    event_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    `event` INT UNSIGNED NOT NULL,
    specific_event INT UNSIGNED NOT NULL,
    event_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id),
    KEY idx_user_activity_events_user (user_id),
    KEY idx_user_activity_events_lookup (`event`, specific_event),
    CONSTRAINT fk_user_activity_events_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_user_activity_events_category
        FOREIGN KEY (`event`) REFERENCES event_lookup (event_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
