<?php
declare(strict_types=1);

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

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    $logDebug('request_rejected', ['reason' => 'method_not_allowed']);
    header('Allow: POST');
    sendJsonResponse([
        'success' => false,
        'status' => 'error',
        'message' => 'Invalid request method. Only POST is allowed.',
        'debug_id' => $debugId,
    ], 405);
    exit;
}

try {
    $debugStage = 'origin check';
    require_once __DIR__ . '/origin-check.php';
    if (!isSameOriginRequest()) {
        $logDebug('request_rejected', ['reason' => 'origin_check_failed']);
        requireSameOriginRequest();
        exit;
    }
    $logDebug('origin_check_passed');

    $debugStage = 'session bootstrap';
    require_once __DIR__ . '/session-bootstrap.php';
    startAccountSession();
    $userId = filter_var(
        $_SESSION['user_id'] ?? null,
        FILTER_VALIDATE_INT,
        ['options' => ['min_range' => 1]]
    );
    $logDebug('session_checked', ['authenticated' => $userId !== false]);

    if ($userId === false) {
        sendJsonResponse([
            'success' => false,
            'status' => 'error',
            'message' => 'Unauthorized: User not logged in.',
            'debug_id' => $debugId,
        ], 401);
        exit;
    }

    $debugStage = 'request body parsing';
    require_once __DIR__ . '/helpers/json-request.php';
    $requestData = readJsonRequestBody(
        null,
        static function (string $reason) use ($logDebug): void {
            $logDebug('request_body_rejected', ['reason' => $reason]);
        }
    );
    $logDebug('request_body_parsed', [
        'first_name_present' => array_key_exists('first_name', $requestData),
        'last_name_present' => array_key_exists('last_name', $requestData),
        'date_of_birth_present' => array_key_exists('date_of_birth', $requestData),
    ]);

    $firstname = isset($requestData['first_name']) && is_string($requestData['first_name'])
        ? trim($requestData['first_name'])
        : '';
    $lastname = isset($requestData['last_name']) && is_string($requestData['last_name'])
        ? trim($requestData['last_name'])
        : '';
    $dateOfBirth = isset($requestData['date_of_birth']) && is_string($requestData['date_of_birth'])
        ? trim($requestData['date_of_birth'])
        : '';
    if ($dateOfBirth === '') {
        $dateOfBirth = null;
    } elseif (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $dateOfBirth, $dateParts) !== 1
        || !checkdate((int) $dateParts[2], (int) $dateParts[3], (int) $dateParts[1])) {
        sendJsonResponse([
            'success' => false,
            'status' => 'error',
            'message' => 'Enter a valid date of birth in YYYY-MM-DD format.',
            'debug_id' => $debugId,
        ], 400);
        exit;
    }

    $firstNameLength = preg_match_all('/./us', $firstname);
    $lastNameLength = preg_match_all('/./us', $lastname);
    if ($firstNameLength === false || $lastNameLength === false
        || $firstNameLength > 100 || $lastNameLength > 100) {
        sendJsonResponse([
            'success' => false,
            'status' => 'error',
            'message' => 'Names must be 100 characters or fewer.',
            'debug_id' => $debugId,
        ], 400);
        exit;
    }

    $logDebug('input_normalized', [
        'first_name_length' => strlen($firstname),
        'last_name_length' => strlen($lastname),
        'date_of_birth_provided' => $dateOfBirth !== null,
    ]);

    $debugStage = 'database connection';
    require_once __DIR__ . '/connection.php';
    $pdo = getDatabaseConnection();
    $logDebug('database_connection_established');

    $debugStage = 'database profile upsert';
    $sql = 'INSERT INTO user_infomation (user_id, firstname, lastname, date_of_birth) '
        . 'VALUES (?, ?, ?, ?) '
        . 'ON DUPLICATE KEY UPDATE firstname = ?, lastname = ?, date_of_birth = ?';
    $statement = $pdo->prepare($sql);
    $logDebug('database_statement_prepared');

    $statement->execute([
        $userId,
        $firstname,
        $lastname,
        $dateOfBirth,
        $firstname,
        $lastname,
        $dateOfBirth,
    ]);
    $logDebug('database_upsert_completed', ['affected_rows' => $statement->rowCount()]);
    require_once __DIR__ . '/helpers/event-tracking.php';
    try {
        logEvent($pdo, $userId, 2, 3);
    } catch (Throwable $eventError) {
        error_log('Unable to record account-updated event: ' . $eventError->getMessage());
    }

    $debugStage = 'success response';
    sendJsonResponse([
        'success' => true,
        'status' => 'success',
        'message' => 'Profile updated successfully.',
        'debug_id' => $debugId,
    ]);
    $logDebug('request_completed');
} catch (Throwable $error) {
    $logDebug('request_failed', [
        'exception' => get_class($error),
        'message' => $error->getMessage(),
        'file' => $error->getFile(),
        'line' => $error->getLine(),
    ]);

    sendJsonResponse([
        'success' => false,
        'status' => 'error',
        'message' => 'Profile update failed. Please try again later.',
        'debug_id' => $debugId,
    ], 500);
}
