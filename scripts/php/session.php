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
$userId = $_SESSION['user_id'] ?? null;
$adminAccess = false;

if (is_string($username) && (is_int($userId) || (is_string($userId) && ctype_digit($userId)))) {
    try {
        require_once __DIR__ . '/connection.php';
        $pdo = getDatabaseConnection();
        $statement = $pdo->prepare('SELECT admin_access FROM users WHERE user_id = ? LIMIT 1');
        $statement->execute([(int) $userId]);
        $adminAccessValue = $statement->fetchColumn();
        $adminAccess = $adminAccessValue !== false && (int) $adminAccessValue === 1;
    } catch (Throwable $e) {
        error_log('Unable to load administrator session status: ' . $e->getMessage());
    }
}

sendJsonResponse([
    'authenticated' => is_string($username),
    'username' => is_string($username) ? $username : null,
    'admin_access' => $adminAccess,
    'session_diagnostics' => [
        'cookie_received' => isset($_COOKIE[session_name()]),
        'user_id_present' => isset($_SESSION['user_id']),
        'username_present' => isset($_SESSION['username']),
    ],
]);
