DELETE FROM login_attempts;

ALTER TABLE login_attempts
    DROP PRIMARY KEY,
    DROP COLUMN ip_hash,
    ADD PRIMARY KEY (username_hash);
