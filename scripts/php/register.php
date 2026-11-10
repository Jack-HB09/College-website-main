<?php
require_once __DIR__ . '/helpers/json-response.php';

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

$username = isset($_POST['username']) ? trim($_POST['username']) : '';
$email = isset($_POST['email']) ? trim($_POST['email']) : '';
$password = isset($_POST['password']) ? $_POST['password'] : '';
$confirmPassword = isset($_POST['confirm-password']) ? $_POST['confirm-password'] : '';

if ($username === '') {
    sendJsonResponse([
        'success' => false,
        'status' => 'error',
        'message' => 'Please enter a username.'
    ]);
    exit;
}

if ($email === '') {
    sendJsonResponse([
        'success' => false,
        'status' => 'error',
        'message' => 'Please enter an email address.'
    ]);
    exit;
}

if (strlen($email) > 254 || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    sendJsonResponse([
        'success' => false,
        'status' => 'error',
        'message' => 'Please enter a valid email address.'
    ]);
    exit;
}

if ($password === '') {
    sendJsonResponse([
        'success' => false,
        'status' => 'error',
        'message' => 'Please enter a password.'
    ]);
    exit;
}

if ($password !== $confirmPassword) {
    sendJsonResponse([
        'success' => false,
        'status' => 'error',
        'message' => 'Passwords do not match.'
    ]);
    exit;
}

$hasMinimumLength = preg_match('/.{8}/us', $password) === 1;
$hasUppercase = preg_match('/[A-Z]/', $password) === 1;
$hasLowercase = preg_match('/[a-z]/', $password) === 1;
$hasDigit = preg_match('/\d/', $password) === 1;
$hasSpecialCharacter = preg_match('/[!@#$%^&*(),.?":{}|<>]/', $password) === 1;

if (!$hasMinimumLength || !$hasUppercase || !$hasLowercase || !$hasDigit || !$hasSpecialCharacter) {
    sendJsonResponse([
        'success' => false,
        'status' => 'error',
        'message' => 'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one digit, and one special character.'
    ]);
    exit;
}

try {
    require_once __DIR__ . '/connection.php';
    $password_hash = password_hash($password, PASSWORD_ARGON2ID);

    $stmt = $pdo->prepare("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)");
    $stmt->execute([$username, $email, $password_hash]);

    sendJsonResponse([
        'success' => true,
        'status' => 'success',
        'message' => 'Registration successful. You can now log in.'
    ]);
} catch (PDOException $e) {
    if ($e->getCode() === '23000') {
        sendJsonResponse([
            'success' => false,
            'status' => 'error',
            'message' => 'That username or email address is already registered.'
        ], 409);
    } else {
        error_log('Database error during registration: ' . $e->getMessage());
        sendJsonResponse([
            'success' => false,
            'status' => 'error',
            'message' => 'Registration could not be completed. Please try again later.'
        ], 500);
    }
}
