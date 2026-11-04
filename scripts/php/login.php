<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(int $status, array $data): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    respond(405, ['message' => 'Only POST requests are supported.']);
}

$requestBody = file_get_contents('php://input');
if ($requestBody === false) {
    respond(400, ['message' => 'Unable to read the request.']);
}

$request = json_decode($requestBody, true);
if (!is_array($request) || json_last_error() !== JSON_ERROR_NONE) {
    respond(400, ['success' => false, 'message' => 'A valid JSON request is required.']);
}

$username = $request['username'] ?? null;
$password = $request['password'] ?? null;
if (!is_string($username) || trim($username) === '' || !is_string($password) || $password === '') {
    respond(400, ['success' => false, 'message' => 'Username and password are required.']);
}

$username = trim($username);
$requirements = [];
$characterCount = preg_match_all('/./u', $password);

if ($characterCount === false) {
    respond(400, ['success' => false, 'message' => 'Password must be valid UTF-8 text.']);
}
if ($characterCount < 12) {
    $requirements[] = 'at least 12 characters';
}
if (!preg_match('/[A-Z]/', $password)) {
    $requirements[] = 'at least one uppercase letter';
}
if (!preg_match('/[a-z]/', $password)) {
    $requirements[] = 'at least one lowercase letter';
}
if (!preg_match('/[0-9]/', $password)) {
    $requirements[] = 'at least one number';
}
if (strpbrk($password, '!@#$%^&*()_+-=[]{}|;:,.<>?') === false) {
    $requirements[] = 'at least one special character';
}
if (preg_match('/(*UCP)\s/u', $password)) {
    $requirements[] = 'no spaces or other whitespace';
}

if ($requirements !== []) {
    respond(422, [
        'success' => false,
        'message' => 'Password must contain ' . implode(', ', $requirements) . '.',
    ]);
}

$passwordHash = password_hash($password, PASSWORD_DEFAULT);
if ($passwordHash === false) {
    respond(500, ['success' => false, 'message' => 'Unable to process the password securely.']);
}

unset($password, $passwordHash);
respond(200, [
    'success' => true,
    'username' => $username,
    'message' => 'The password was hashed, but this demo does not save accounts or authenticate logins.',
]);