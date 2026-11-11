<?php
declare(strict_types=1);

require_once __DIR__ . '/password-recovery-common.php';

header('Cache-Control: no-store');
requireRecoveryPostRequest();
requireRecoveryOrigin();
$request = readRecoveryRequest();

$questionId = isset($request['question_id']) && (is_int($request['question_id']) || is_string($request['question_id']))
    ? filter_var($request['question_id'], FILTER_VALIDATE_INT)
    : false;
$answer = isset($request['answer']) && is_string($request['answer']) ? trim($request['answer']) : '';

if ($questionId === false || $questionId < 1 || $answer === '' || strlen($answer) > 200) {
    recoveryError('Please choose a question and enter an answer.');
    exit;
}

try {
    requireRecoverySession();
    $userId = getRecoverySessionUserId();
    if ($userId === null) {
        recoveryError('Please sign in before setting a recovery question.', 401);
        exit;
    }

    $questions = loadSecurityQuestions();
    if (!array_key_exists((string) $questionId, $questions)) {
        recoveryError('Please choose a question from the list.');
        exit;
    }

    require_once __DIR__ . '/connection.php';
    $pdo = getDatabaseConnection();
    $answerHash = password_hash($answer, PASSWORD_ARGON2ID);

    $statement = $pdo->prepare(
        'INSERT INTO user_infomation (user_id, security_question, security_answer) VALUES (?, ?, ?) '
        . 'ON DUPLICATE KEY UPDATE security_question = ?, security_answer = ?'
    );
    $statement->execute([$userId, $questionId, $answerHash, $questionId, $answerHash]);

    sendJsonResponse([
        'success' => true,
        'message' => 'Your recovery question has been saved.'
    ]);
} catch (Throwable $error) {
    error_log('Unable to save a password recovery question: ' . $error->getMessage());
    recoveryError('Your recovery question could not be saved. Please try again later.', 500);
}
