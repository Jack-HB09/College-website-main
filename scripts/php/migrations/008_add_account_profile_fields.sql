ALTER TABLE user_infomation
    ADD COLUMN firstname VARCHAR(100) NULL AFTER user_id,
    ADD COLUMN lastname VARCHAR(100) NULL AFTER firstname,
    ADD COLUMN date_of_birth DATE NULL AFTER lastname;
