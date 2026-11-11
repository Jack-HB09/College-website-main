<?php
declare(strict_types=1);

require_once __DIR__ . '/../password-recovery-common.php';

function assertRecoverySame($expected, $actual, string $message): void
{
    if ($expected !== $actual) {
        throw new RuntimeException($message);
    }
}

$questions = loadSecurityQuestions();
assertRecoverySame(5, count($questions), 'The configured recovery question list should contain five choices.');
foreach ($questions as $id => $question) {
    assertRecoverySame(true, ctype_digit((string) $id), 'Recovery question IDs should be numeric.');
    assertRecoverySame(true, is_string($question) && trim($question) !== '', 'Each recovery question should have readable text.');
}

assertRecoverySame(
    'person@example.com',
    normalizeRecoveryEmail('  Person@Example.com  '),
    'Email addresses should be trimmed and normalized consistently.'
);
assertRecoverySame(
    makeRecoveryAccountKey(42),
    makeRecoveryAccountKey(42),
    'An account should always map to the same rate-limit key.'
);
assertRecoverySame(
    true,
    makeRecoveryAccountKey(42) !== makeRecoveryAccountKey(43),
    'Different accounts should use different rate-limit keys.'
);
assertRecoverySame(
    true,
    makeRecoveryAccountKey(null) !== makeRecoveryAccountKey(42),
    'Unknown accounts should not share a rate-limit key with a real account.'
);
assertRecoverySame(true, isRecoveryPasswordValid('DemoCollege!2026'), 'The existing registration password policy should be accepted.');
assertRecoverySame(false, isRecoveryPasswordValid('short'), 'Passwords that do not meet the policy should be rejected.');
assertRecoverySame(false, isRecoveryPasswordValid('NoSpecial123'), 'Passwords without a special character should be rejected.');

$answer = 'a private recovery answer';
$answerHash = password_hash($answer, PASSWORD_ARGON2ID);
assertRecoverySame(true, is_string($answerHash), 'Recovery answers should be hashable using the configured password algorithm.');
assertRecoverySame(false, $answerHash === $answer, 'Recovery answers must not be stored as plain text.');
assertRecoverySame(true, password_verify($answer, $answerHash), 'A hashed recovery answer should verify against the original answer.');
assertRecoverySame(false, password_verify('a different answer', $answerHash), 'A different recovery answer should not verify.');

$_SESSION['user_id'] = '42';
assertRecoverySame(42, getRecoverySessionUserId(), 'A numeric session user ID should be read as an integer.');
$_SESSION['user_id'] = 'not-a-user';
assertRecoverySame(null, getRecoverySessionUserId(), 'An invalid session user ID should not be accepted.');
unset($_SESSION['user_id']);

echo "Password recovery helper tests passed.\n";
