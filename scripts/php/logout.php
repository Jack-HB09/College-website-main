<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Only POST requests are supported.']);
    exit;
}
if (!session_start()) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to end the account session.']);
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
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to end the account session.']);
    exit;
}

echo json_encode(['success' => true]);