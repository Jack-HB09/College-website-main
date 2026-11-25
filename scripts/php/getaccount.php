<?php
declare(strict_types=1);
session_start();

require_once __DIR__ . '/helpers/json-response.php';

ini_set('display_errors', '0');
ini_set('log_errors', '1');

$debugId = bin2hex(random_bytes(8));
$debugStage = 'request setup';
$logDebug = static function (string $event, array $context = []) use (&$debugId, &$debugStage): void {
    $details = json_encode(
        ['event' => $event, 'stage' => $debugStage] + $context,
        JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE
    );

    error_log(sprintf('Account profile update [%s] %s', $debugId, $details ?: $event));
};

set_error_handler(static function (int $severity, string $message, string $file, int $line) use (&$debugId, &$debugStage): bool {
    if ((error_reporting() & $severity) !== 0) {
        error_log(sprintf(
            'Account profile update PHP diagnostic [%s] at stage "%s": %s in %s:%d',
            $debugId,
            $debugStage,
            $message,
            $file,
            $line
        ));
    }

    return false;
});

register_shutdown_function(static function () use (&$debugStage, &$debugId): void {
    $error = error_get_last();
    $fatalErrorTypes = [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR, E_RECOVERABLE_ERROR];

    if ($error !== null && in_array($error['type'], $fatalErrorTypes, true)) {
        error_log(sprintf(
            'Account profile update fatal PHP error [%s] at stage "%s": %s in %s:%d',
            $debugId,
            $debugStage,
            $error['message'],
            $error['file'],
            $error['line']
        ));
    }
});

$logDebug('request_received', [
    'method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'missing',
]);
try {
    require_once __DIR__ . '/connection.php';
    $pdo = getDatabaseConnection();
    $stmt = $pdo->prepare('SELECT * FROM user_infomation where user_id = ? LIMIT 1');
    $stmt->execute([$_SESSION['user_id'] ?? null]);
    $userdata = $stmt->fetch();
    if ($userdata !== null) {
        sendJsonResponse(['success' => true, 'userdata' => $userdata, 'message' => 'User data retrieved successfully.']);
    } else {
        sendJsonResponse(['success' => false, 'message' => 'User not found.', 'userdata' => null], 404);
    }
}catch (Throwable $e) {
    $logDebug('database_error', ['error_message' => $e->getMessage()]);
    sendJsonResponse(['success' => false, 'message' => 'Unable to retrieve account information.', 'userdata' => null], 500);
    exit;
}