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
if ($email !== '' && (strlen($email) > 254 || filter_var($email, FILTER_VALIDATE_EMAIL) === false)) {
    recoveryError('We could not load a recovery question for those details.');
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
    if ($userId === null) {
        recoveryError('We could not load a recovery question for those details.');
        exit;
    }

    $statement = $pdo->prepare(
        'SELECT security_question FROM user_infomation WHERE user_id = ? LIMIT 1'
    );
    $statement->execute([$userId]);
    $questionId = $statement->fetchColumn();
    if ($questionId === false) {
        recoveryError('We could not load a recovery question for those details.');
        exit;
    }

    $questions = loadSecurityQuestions();
    $questionId = (int) $questionId;
    if (!array_key_exists((string) $questionId, $questions)) {
        throw new RuntimeException('The account has an unknown security-question ID.');
    }

    sendJsonResponse([
        'success' => true,
        'question_id' => $questionId,
        'question' => $questions[(string) $questionId]
    ]);
} catch (Throwable $error) {
    error_log('Unable to load a password recovery question: ' . $error->getMessage());
    recoveryError('We could not load a recovery question. Please try again later.', 500);
}
