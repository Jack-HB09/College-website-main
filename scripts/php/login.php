<?php
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'success' => false,
        'status' => 'error',
        'message' => 'Invalid request method. Only POST is allowed.'
    ]);
    exit;
}

$username = isset($_POST['username']) ? trim($_POST['username']) : '';
$password = isset($_POST['password']) ? trim($_POST['password']) : '';

if (empty($username) || empty($password)) {
    echo json_encode([
        'success' => false,
        'status' => 'error',
        'message' => 'Please provide both username and password.'
    ]);
    exit;
}

try {
    require_once __DIR__ . '/connection.php';

    $stmt = $pdo->prepare("SELECT id, password_hash FROM users WHERE username = ? LIMIT 1");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password_hash'])) {
        session_start();
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $username;

        echo json_encode([
            'success' => true,
            'status' => 'success',
            'message' => 'Login successful.',
            'user_id' => $user['id']
        ]);
        
    } else {
        echo json_encode([
            'success' => false,
            'status' => 'error',
            'message' => 'Invalid username or password.'
        ]);
    }

} catch (Throwable $e) {
    error_log('Login processing failed: ' . $e->getMessage());
    echo json_encode([
        'success' => false,
        'status' => 'error',
        'message' => 'An error occurred while processing your request.'
    ]);
}