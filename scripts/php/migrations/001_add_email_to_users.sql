ALTER TABLE users
    ADD COLUMN email VARCHAR(254) NULL AFTER username,
    ADD UNIQUE KEY uq_users_email (email);
