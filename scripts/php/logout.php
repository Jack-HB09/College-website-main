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

sendJsonResponse(['success' => true]);