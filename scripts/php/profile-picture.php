<?php
declare(strict_types=1);

require_once __DIR__ . '/profile-picture-common.php';
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');

$method = $_SERVER['REQUEST_METHOD'] ?? '';
if ($method !== 'GET' && $method !== 'POST') {
    header('Allow: GET, POST');
    sendProfilePictureError('This request could not be completed. Please try again.', 405);
    exit;
}

if ($method === 'POST') {
    require_once __DIR__ . '/origin-check.php';
    requireSameOriginRequest('This request could not be completed. Please try again.');
}

require_once __DIR__ . '/session-bootstrap.php';
try {
    startAccountSession();
    $userId = getProfilePictureUserId();
} catch (Throwable $error) {
    error_log('Unable to start the profile picture session: ' . $error->getMessage());
    sendProfilePictureError('Your profile picture could not be loaded. Please try again later.', 500);
    exit;
}

require_once __DIR__ . '/connection.php';
try {
    $pdo = getDatabaseConnection();

    if ($method === 'GET') {
        $statement = $pdo->prepare(
            'SELECT profile_picture FROM user_infomation WHERE user_id = ? LIMIT 1'
        );
        $statement->execute([$userId]);
        $picture = $statement->fetchColumn();
        if (is_resource($picture)) {
            $picture = stream_get_contents($picture);
        }
        if (!is_string($picture) || $picture === '') {
            http_response_code(404);
            exit;
        }

        header('Content-Type: image/jpeg');
        header("Content-Security-Policy: default-src 'none'; sandbox");
        header('Content-Length: ' . strlen($picture));
        echo $picture;
        exit;
    }

    $contentLength = filter_var($_SERVER['CONTENT_LENGTH'] ?? null, FILTER_VALIDATE_INT);
    if (is_int($contentLength) && $contentLength > PROFILE_PICTURE_MAX_UPLOAD_BYTES + 65536) {
        sendProfilePictureError('That image is too large. Choose a smaller image.', 413);
        exit;
    }

    try {
        $picture = normalizeProfilePictureUpload($_FILES['profile_picture'] ?? []);
    } catch (InvalidArgumentException $error) {
        sendProfilePictureError($error->getMessage(), 400);
        exit;
    } catch (RuntimeException $error) {
        error_log('Profile picture processing is unavailable: ' . $error->getMessage());
        sendProfilePictureError('Images cannot be processed right now. Please try again later.', 500);
        exit;
    }

    $statement = $pdo->prepare(
        'INSERT INTO user_infomation (user_id, profile_picture) VALUES (?, ?) '
        . 'ON DUPLICATE KEY UPDATE profile_picture = ?'
    );
    $statement->bindValue(1, $userId, PDO::PARAM_INT);
    $statement->bindValue(2, $picture, PDO::PARAM_LOB);
    $statement->bindValue(3, $picture, PDO::PARAM_LOB);
    $statement->execute();

    sendJsonResponse([
        'success' => true,
        'message' => 'Your profile picture has been updated.'
    ]);
} catch (Throwable $error) {
    error_log('Unable to update or load a profile picture: ' . $error->getMessage());
    sendProfilePictureError('Your profile picture could not be saved. Please try again later.', 500);
}
