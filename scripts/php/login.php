<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

ob_start();

function respond(int $status, array $data): void
{
    http_response_code($status);
    if (ob_get_level() > 0) {
        ob_clean();
    }

    try {
        $json = json_encode(
            $data,
            JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE | JSON_THROW_ON_ERROR
        );
    } catch (JsonException $error) {
        http_response_code(500);
        $json = '{"success":false,"message":"Unable to create a JSON response."}';
    }

    echo $json;
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    respond(405, ['success' => false, 'message' => 'Only POST requests are supported.']);
}

$requestBody = file_get_contents('php://input');
if ($requestBody === false) {
    respond(400, ['success' => false, 'message' => 'Unable to read the request.']);
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
    'message' => 'Password format validated. This demo does not save accounts or authenticate logins.',
]);