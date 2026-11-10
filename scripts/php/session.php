<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers/json-response.php';
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET');
    sendJsonResponse(['authenticated' => false, 'message' => 'Only GET requests are supported.'], 405);
    exit;
}

require_once __DIR__ . '/session-bootstrap.php';
try {
    startAccountSession();
} catch (Throwable $e) {
    error_log('Unable to load account session: ' . $e->getMessage());
    sendJsonResponse(['authenticated' => false, 'message' => 'Unable to load account status.'], 500);
    exit;
}

$username = $_SESSION['username'] ?? null;
sendJsonResponse([
    'authenticated' => is_string($username),
    'username' => is_string($username) ? $username : null,
]);
