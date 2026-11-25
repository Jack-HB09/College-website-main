<?php
declare(strict_types=1);

require_once __DIR__ . '/password-recovery-common.php';

header('Cache-Control: no-store');
requireRecoveryPostRequest();
requireRecoveryOrigin();
$request = readRecoveryRequest();

$email = isset($request['email']) && is_string($request['email'])
    ? normalizeRecoveryEmail($request['email'])
    : '';
$questionId = isset($request['question_id']) && (is_int($request['question_id']) || is_string($request['question_id']))
    ? filter_var($request['question_id'], FILTER_VALIDATE_INT)
    : false;
$answer = isset($request['answer']) && is_string($request['answer']) ? trim($request['answer']) : '';
$password = isset($request['password']) && is_string($request['password']) ? $request['password'] : '';
$confirmPassword = isset($request['confirm_password']) && is_string($request['confirm_password'])
    ? $request['confirm_password']
    : '';

if ($email !== '' && (strlen($email) > 254 || filter_var($email, FILTER_VALIDATE_EMAIL) === false)) {
    recoveryError('Enter a valid email address.');
    exit;
}
if ($questionId === false || $questionId < 1 || $answer === '' || strlen($answer) > 200) {
    recoveryError('Please enter your recovery answer.');
    exit;
}
if ($password === '' || !isRecoveryPasswordValid($password)) {
    recoveryError('Choose a password with at least 8 characters, including an uppercase letter, a lowercase letter, a number, and a special character.');
    exit;
}
if ($password !== $confirmPassword) {
    recoveryError('The passwords do not match.');
    exit;
}

try {
    requireRecoverySession();
    $sessionUserId = getRecoverySessionUserId();
    if ($sessionUserId === null && $email === '') {
        recoveryError('Enter the email address for your account.');
        exit;
    }

    require_once __DIR__ . '/connection.php';
    $pdo = getDatabaseConnection();
    $userId = getRecoveryUserId($pdo, $sessionUserId, $email);
    $accountKey = makeRecoveryAccountKey($userId);

    $pdo->beginTransaction();
    $user = null;
    if ($userId !== null) {
        $statement = $pdo->prepare(
            'SELECT i.security_question, i.security_answer '
            . 'FROM users u LEFT JOIN user_infomation i ON i.user_id = u.user_id '
            . 'WHERE u.user_id = ? FOR UPDATE'
        );
        $statement->execute([$userId]);
        $user = $statement->fetch();
    }

    $statement = $pdo->prepare(
        'INSERT INTO password_reset_attempts (account_key, attempt_count, attempt_date) VALUES (?, 0, UTC_DATE()) '
        . 'ON DUPLICATE KEY UPDATE account_key = account_key'
    );
    $statement->execute([$accountKey]);
    $statement = $pdo->prepare(
        'UPDATE password_reset_attempts SET attempt_count = 0, attempt_date = UTC_DATE() '
        . 'WHERE account_key = ? AND attempt_date <> UTC_DATE()'
    );
    $statement->execute([$accountKey]);
    $statement = $pdo->prepare(
        'SELECT attempt_count FROM password_reset_attempts WHERE account_key = ? FOR UPDATE'
    );
    $statement->execute([$accountKey]);
    $attemptCount = (int) $statement->fetchColumn();

    if ($attemptCount >= 5) {
        $pdo->commit();
        recoveryError('There have been too many unsuccessful tries today. Please try again tomorrow.', 429);
        exit;
    }

    $questionMatches = is_array($user)
        && isset($user['security_question'], $user['security_answer'])
        && (int) $user['security_question'] === $questionId
        && is_string($user['security_answer'])
        && password_verify($answer, $user['security_answer']);
    if (!$questionMatches) {
        $statement = $pdo->prepare(
            'UPDATE password_reset_attempts SET attempt_count = attempt_count + 1 WHERE account_key = ?'
        );
        $statement->execute([$accountKey]);
        $pdo->commit();
        recoveryError('Those details could not be confirmed. Check your answer and try again.', 400);
        exit;
    }

    $passwordHash = password_hash($password, PASSWORD_ARGON2ID);
    $statement = $pdo->prepare('UPDATE users SET password_hash = ? WHERE user_id = ?');
    $statement->execute([$passwordHash, $userId]);
    $pdo->commit();
    require_once __DIR__ . '/helpers/event-tracking.php';
    try {
        logEvent($pdo, $userId, 2, 6);
    } catch (Throwable $eventError) {
        error_log('Unable to record password-reset-completed event: ' . $eventError->getMessage());
    }

    $sessionEnded = endRecoverySession();
    if (!$sessionEnded) {
        error_log('The password was changed, but the account session could not be ended.');
    }
    sendJsonResponse([
        'success' => true,
        'message' => $sessionEnded
            ? 'Your password has been changed. Please sign in again.'
            : 'Your password has been changed. Close this browser before signing in again.'
    ]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Unable to reset an account password: ' . $error->getMessage());
    recoveryError('Your password could not be changed. Please try again later.', 500);
}
