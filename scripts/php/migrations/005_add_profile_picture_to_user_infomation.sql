ALTER TABLE user_infomation
    MODIFY security_question INT UNSIGNED NULL,
    MODIFY security_answer VARCHAR(255) NULL,
    ADD COLUMN profile_picture MEDIUMBLOB NULL AFTER security_answer;
