<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers/json-response.php';
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    sendJsonResponse(['success' => false, 'message' => 'Only POST requests are supported.'], 405);
    exit;
}
require_once __DIR__ . '/origin-check.php';
requireSameOriginRequest();

require_once __DIR__ . '/session-bootstrap.php';
try {
    startAccountSession();
} catch (Throwable $e) {
    error_log('Unable to start session for logout: ' . $e->getMessage());
    sendJsonResponse(['success' => false, 'message' => 'Unable to end the account session.'], 500);
    exit;
}

$logoutUserId = filter_var(
    $_SESSION['user_id'] ?? null,
    FILTER_VALIDATE_INT,
    ['options' => ['min_range' => 1]]
);

$_SESSION = [];
$cookieParameters = session_get_cookie_params();
if (ini_get('session.use_cookies')) {
    setcookie(session_name(), '', [
        'expires' => time() - 42000,
        'path' => $cookieParameters['path'],
        'domain' => $cookieParameters['domain'],
        'secure' => $cookieParameters['secure'],
        'httponly' => $cookieParameters['httponly'],
        'samesite' => $cookieParameters['samesite'],
    ]);
}

if (!session_destroy()) {
    sendJsonResponse(['success' => false, 'message' => 'Unable to end the account session.'], 500);
    exit;
}

if ($logoutUserId !== false) {
    try {
        require_once __DIR__ . '/connection.php';
        require_once __DIR__ . '/helpers/event-tracking.php';
        logEvent(getDatabaseConnection(), (int) $logoutUserId, 3, 1);
    } catch (Throwable $eventError) {
        error_log('Unable to record logout event: ' . $eventError->getMessage());
    }
}

sendJsonResponse(['success' => true]);