<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

ob_start();

const DEMO_USERNAME = 'test';
const DEMO_PASSWORD_SALT = '3b584eb430ffb5fa9239760dd519cafb';
const DEMO_PASSWORD_HASH = '34f307734faf9d0729b5949ee6c907c68a27bd9958519e543d2e3439f5cea0b0';
const DEMO_PASSWORD_ITERATIONS = 210000;

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
$salt = hex2bin(DEMO_PASSWORD_SALT);
if ($salt === false) {
    respond(500, ['success' => false, 'message' => 'Unable to verify the password securely.']);
}

$passwordHash = hash_pbkdf2('sha256', $password, $salt, DEMO_PASSWORD_ITERATIONS, 64);
if ($passwordHash === false) {
    respond(500, ['success' => false, 'message' => 'Unable to verify the password securely.']);
}

if (!hash_equals(DEMO_PASSWORD_HASH, $passwordHash) || $username !== DEMO_USERNAME) {
    respond(401, ['success' => false, 'message' => 'The username or password is incorrect.']);
}

unset($password, $passwordHash, $salt);

session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'httponly' => true,
    'samesite' => 'Lax',
]);
if (!session_start() || !session_regenerate_id(true)) {
    respond(500, ['success' => false, 'message' => 'Unable to start a secure session.']);
}

$_SESSION['username'] = $username;
respond(200, [
    'success' => true,
    'username' => $username,
    'message' => 'You have successfully signed in.',
]);