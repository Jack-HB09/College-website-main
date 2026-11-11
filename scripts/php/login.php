<?php
require_once __DIR__ . '/helpers/json-response.php';

ini_set('display_errors', '0');
ini_set('log_errors', '1');

$loginDebugStage = 'request setup';
$loginDebugId = bin2hex(random_bytes(8));
set_error_handler(static function (int $severity, string $message, string $file, int $line) use (&$loginDebugId, &$loginDebugStage): bool {
    if ((error_reporting() & $severity) !== 0) {
        error_log(sprintf(
            'Login PHP diagnostic [%s] at stage "%s": %s in %s:%d',
            $loginDebugId,
            $loginDebugStage,
            $message,
            $file,
            $line
        ));
    }

    return false;
});

register_shutdown_function(static function () use (&$loginDebugStage, &$loginDebugId): void {
    $error = error_get_last();
    $fatalErrorTypes = [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR, E_RECOVERABLE_ERROR];

    if ($error !== null && in_array($error['type'], $fatalErrorTypes, true)) {
        error_log(sprintf(
            'Login fatal PHP error [%s] at stage "%s": %s in %s:%d',
            $loginDebugId,
            $loginDebugStage,
            $error['message'],
            $error['file'],
            $error['line']
        ));
    }
});

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
    $loginDebugStage = 'database connection';
    require_once __DIR__ . '/connection.php';
    $pdo = getDatabaseConnection();
    $loginDebugStage = 'load session and rate-limit helpers';
    require_once __DIR__ . '/session-bootstrap.php';
    require_once __DIR__ . '/login-rate-limit.php';

    $loginDebugStage = 'login rate limit check';
    if (isLoginAttemptLimited($pdo, $username)) {
        sendJsonResponse([
            'success' => false,
            'status' => 'error',
            'message' => 'Login is temporarily unavailable. Please try again later.'
        ], 429);
        exit;
    }

    $loginDebugStage = 'prepare user lookup query';
    $stmt = $pdo->prepare("SELECT user_id, password_hash FROM users WHERE username = ? LIMIT 1");

    $loginDebugStage = 'execute user lookup query';
    $stmt->execute([$username]);

    $loginDebugStage = 'fetch user lookup result';
    $user = $stmt->fetch();

    $loginDebugStage = 'verify password hash';
    $passwordMatches = is_array($user)
        && isset($user['password_hash'])
        && is_string($user['password_hash'])
        && password_verify($password, $user['password_hash']);

    if ($passwordMatches) {
        $loginDebugStage = 'clear failed login attempts';
        clearFailedLoginAttempts($pdo, $username);
        $loginDebugStage = 'start account session';
        startAccountSession();
        $loginDebugStage = 'rotate session ID';
        if (!session_regenerate_id(true)) {
            throw new RuntimeException('Unable to rotate the account session ID.');
        }
        $loginDebugStage = 'store authenticated session';
        $_SESSION['user_id'] = $user['user_id'];
        $_SESSION['username'] = $username;

        $loginDebugStage = 'send successful login response';
        sendJsonResponse([
            'success' => true,
            'status' => 'success',
            'message' => 'Login successful.',
            'user_id' => $user['user_id']
        ]);
    } else {
        $loginDebugStage = 'record failed login attempt';
        recordFailedLoginAttempt($pdo, $username);
        $loginDebugStage = 'send invalid credentials response';
        sendJsonResponse([
            'success' => false,
            'status' => 'error',
            'message' => 'Invalid username or password.'
        ]);
    }

} catch (Throwable $e) {
    error_log(sprintf(
        'Login failure [%s] at stage "%s": %s: %s in %s:%d%s',
        $loginDebugId,
        $loginDebugStage,
        get_class($e),
        $e->getMessage(),
        $e->getFile(),
        $e->getLine(),
        PHP_EOL . $e->getTraceAsString()
    ));
    if ($e->getPrevious() !== null) {
        error_log(sprintf(
            'Login failure [%s] previous exception: %s: %s in %s:%d%s%s',
            $loginDebugId,
            get_class($e->getPrevious()),
            $e->getPrevious()->getMessage(),
            $e->getPrevious()->getFile(),
            $e->getPrevious()->getLine(),
            PHP_EOL,
            $e->getPrevious()->getTraceAsString()
        ));
    }
    sendJsonResponse([
        'success' => false,
        'status' => 'error',
        'message' => 'An error occurred while processing your request.',
        'debug_id' => $loginDebugId,
        'debug_stage' => $loginDebugStage
    ], 500);
}