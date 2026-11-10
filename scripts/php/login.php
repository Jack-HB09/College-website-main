<?php
require_once __DIR__ . '/helpers/json-response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse([
        'success' => false,
        'status' => 'error',
        'message' => 'Invalid request method. Only POST is allowed.'
    ]);
    exit;
}

require_once __DIR__ . '/origin-check.php';
requireSameOriginRequest();
require_once __DIR__ . '/helpers/json-request.php';

$requestData = readJsonRequestBody();
$username = isset($requestData['username']) && is_string($requestData['username'])
    ? trim($requestData['username'])
    : '';
$password = isset($requestData['password']) && is_string($requestData['password'])
    ? $requestData['password']
    : '';

if ($username === '' || $password === '') {
    sendJsonResponse([
        'success' => false,
        'status' => 'error',
        'message' => 'Please provide both username and password.'
    ]);
    exit;
}

try {
    require_once __DIR__ . '/connection.php';
    require_once __DIR__ . '/session-bootstrap.php';
    require_once __DIR__ . '/login-rate-limit.php';

    if (isLoginAttemptLimited($pdo, $username)) {
        sendJsonResponse([
            'success' => false,
            'status' => 'error',
            'message' => 'Login is temporarily unavailable. Please try again later.'
        ], 429);
        exit;
    }

    $stmt = $pdo->prepare("SELECT id, password_hash FROM users WHERE username = ? LIMIT 1");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password_hash'])) {
        clearFailedLoginAttempts($pdo, $username);
        startAccountSession();
        if (!session_regenerate_id(true)) {
            throw new RuntimeException('Unable to rotate the account session ID.');
        }
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $username;

        sendJsonResponse([
            'success' => true,
            'status' => 'success',
            'message' => 'Login successful.',
            'user_id' => $user['id']
        ]);
    } else {
        recordFailedLoginAttempt($pdo, $username);
        sendJsonResponse([
            'success' => false,
            'status' => 'error',
            'message' => 'Invalid username or password.'
        ]);
    }

} catch (Throwable $e) {
    error_log('Login processing failed: ' . $e->getMessage());
    sendJsonResponse([
        'success' => false,
        'status' => 'error',
        'message' => 'An error occurred while processing your request.'
    ]);
}