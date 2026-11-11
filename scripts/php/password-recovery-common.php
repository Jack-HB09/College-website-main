<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers/json-response.php';

function loadSecurityQuestions(): array
{
    $questionsPath = __DIR__ . '/../security-questions.json';
    $contents = file_get_contents($questionsPath);
    if ($contents === false) {
        throw new RuntimeException('Unable to read the security-question list.');
    }

    $questions = json_decode($contents, true);
    if (!is_array($questions) || $questions === []) {
        throw new RuntimeException('The security-question list is invalid.');
    }

    foreach ($questions as $id => $question) {
        if (!ctype_digit((string) $id) || (int) $id < 1 || !is_string($question) || trim($question) === '') {
            throw new RuntimeException('The security-question list contains an invalid entry.');
        }
    }

    return $questions;
}

function normalizeRecoveryEmail(string $email): string
{
    return strtolower(trim($email));
}

function getRecoverySessionUserId(): ?int
{
    $userId = $_SESSION['user_id'] ?? null;
    if (is_int($userId) && $userId > 0) {
        return $userId;
    }

    if (is_string($userId) && ctype_digit($userId) && (int) $userId > 0) {
        return (int) $userId;
    }

    return null;
}

function getRecoveryUserId(PDO $pdo, ?int $sessionUserId, string $email): ?int
{
    if ($sessionUserId !== null) {
        $statement = $pdo->prepare('SELECT user_id FROM users WHERE user_id = ? LIMIT 1');
        $statement->execute([$sessionUserId]);
    } else {
        $statement = $pdo->prepare('SELECT user_id FROM users WHERE email = ? LIMIT 1');
        $statement->execute([$email]);
    }

    $userId = $statement->fetchColumn();
    return $userId === false ? null : (int) $userId;
}

function makeRecoveryAccountKey(?int $userId): string
{
    $identifier = $userId === null ? 'unknown-account' : 'user:' . $userId;
    return hash('sha256', $identifier);
}

function isRecoveryPasswordValid(string $password): bool
{
    return preg_match('/.{8}/us', $password) === 1
        && preg_match('/[A-Z]/', $password) === 1
        && preg_match('/[a-z]/', $password) === 1
        && preg_match('/\d/', $password) === 1
        && preg_match('/[!@#$%^&*(),.?":{}|<>]/', $password) === 1;
}

function endRecoverySession(): bool
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        return true;
    }

    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $cookie = session_get_cookie_params();
        $cookieCleared = setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $cookie['path'],
            'domain' => $cookie['domain'],
            'secure' => $cookie['secure'],
            'httponly' => $cookie['httponly'],
            'samesite' => $cookie['samesite'] ?? 'Lax',
        ]);
        if (!$cookieCleared) {
            error_log('Unable to clear the session cookie after a password reset.');
        }
    }

    return session_destroy();
}

function requireRecoveryPostRequest(): void
{
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        return;
    }

    header('Allow: POST');
    sendJsonResponse([
        'success' => false,
        'message' => 'This request could not be completed. Please try again.'
    ], 405);
    exit;
}

function requireRecoverySession(): void
{
    require_once __DIR__ . '/session-bootstrap.php';
    startAccountSession();
}

function requireRecoveryOrigin(): void
{
    require_once __DIR__ . '/origin-check.php';
    requireSameOriginRequest('This request could not be completed. Please try again.');
}

function readRecoveryRequest(): array
{
    require_once __DIR__ . '/helpers/json-request.php';
    return readJsonRequestBody('This request could not be completed. Please try again.');
}

function recoveryError(string $message, int $statusCode = 400): void
{
    sendJsonResponse([
        'success' => false,
        'message' => $message
    ], $statusCode);
}
