<?php
declare(strict_types=1);

function loginAttemptKeys(string $username): array
{
    $ipAddress = $_SERVER['REMOTE_ADDR'] ?? '';
    if (filter_var($ipAddress, FILTER_VALIDATE_IP) === false) {
        throw new RuntimeException('A valid client IP address is required for login throttling.');
    }

    return [
        hash('sha256', strtolower($username)),
        hash('sha256', $ipAddress),
    ];
}

function isLoginAttemptLimited(PDO $pdo, string $username): bool
{
    [$usernameHash, $ipHash] = loginAttemptKeys($username);

    $cleanup = $pdo->prepare(
        'DELETE FROM login_attempts WHERE window_started_at < UTC_TIMESTAMP() - INTERVAL 1 DAY'
    );
    $cleanup->execute();

    $stmt = $pdo->prepare(
        'SELECT attempt_count FROM login_attempts
         WHERE username_hash = ? AND ip_hash = ?
           AND window_started_at >= UTC_TIMESTAMP() - INTERVAL 15 MINUTE'
    );
    $stmt->execute([$usernameHash, $ipHash]);
    $attemptCount = $stmt->fetchColumn();

    return $attemptCount !== false && (int) $attemptCount >= 5;
}

function recordFailedLoginAttempt(PDO $pdo, string $username): void
{
    [$usernameHash, $ipHash] = loginAttemptKeys($username);
    $stmt = $pdo->prepare(
        'INSERT INTO login_attempts (username_hash, ip_hash, attempt_count, window_started_at)
         VALUES (?, ?, 1, UTC_TIMESTAMP())
         ON DUPLICATE KEY UPDATE
           attempt_count = CASE
             WHEN window_started_at < UTC_TIMESTAMP() - INTERVAL 15 MINUTE THEN 1
             ELSE attempt_count + 1
           END,
           window_started_at = CASE
             WHEN window_started_at < UTC_TIMESTAMP() - INTERVAL 15 MINUTE THEN UTC_TIMESTAMP()
             ELSE window_started_at
           END'
    );
    $stmt->execute([$usernameHash, $ipHash]);
}

function clearFailedLoginAttempts(PDO $pdo, string $username): void
{
    [$usernameHash, $ipHash] = loginAttemptKeys($username);
    $stmt = $pdo->prepare(
        'DELETE FROM login_attempts WHERE username_hash = ? AND ip_hash = ?'
    );
    $stmt->execute([$usernameHash, $ipHash]);
}
