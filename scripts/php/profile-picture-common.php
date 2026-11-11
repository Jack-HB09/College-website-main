<?php
declare(strict_types=1);

const PROFILE_PICTURE_MAX_UPLOAD_BYTES = 8388608;
const PROFILE_PICTURE_MAX_PIXELS = 12000000;
const PROFILE_PICTURE_MAX_DIMENSION = 8000;
const PROFILE_PICTURE_MAX_STORED_BYTES = 2097152;

require_once __DIR__ . '/helpers/json-response.php';

function sendProfilePictureError(string $message, int $statusCode = 400): void
{
    sendJsonResponse([
        'success' => false,
        'message' => $message
    ], $statusCode);
}

function getProfilePictureUserId(): int
{
    $userId = $_SESSION['user_id'] ?? null;
    if (is_int($userId) && $userId > 0) {
        return $userId;
    }

    if (is_string($userId) && ctype_digit($userId) && (int) $userId > 0) {
        return (int) $userId;
    }

    sendProfilePictureError('Please sign in to manage your profile picture.', 401);
    exit;
}

function normalizeProfilePictureUpload(array $upload): string
{
    if (!isset($upload['error'], $upload['tmp_name'], $upload['size'])
        || !is_int($upload['error'])
        || !is_string($upload['tmp_name'])
        || !is_int($upload['size'])) {
        throw new InvalidArgumentException('Choose an image file and try again.');
    }

    if ($upload['error'] !== UPLOAD_ERR_OK) {
        if ($upload['error'] === UPLOAD_ERR_INI_SIZE || $upload['error'] === UPLOAD_ERR_FORM_SIZE) {
            $message = 'That image is too large. Choose a smaller image.';
        } elseif ($upload['error'] === UPLOAD_ERR_NO_FILE) {
            $message = 'Choose an image file to upload.';
        } else {
            $message = 'The image could not be uploaded. Please try again.';
        }
        throw new InvalidArgumentException($message);
    }

    if ($upload['size'] < 1 || $upload['size'] > PROFILE_PICTURE_MAX_UPLOAD_BYTES) {
        throw new InvalidArgumentException('Choose an image smaller than 8 MB.');
    }

    if (!is_uploaded_file($upload['tmp_name'])) {
        throw new InvalidArgumentException('The image could not be uploaded. Please try again.');
    }

    if (!class_exists('finfo') || !function_exists('imagecreatefromstring') || !function_exists('imagejpeg')) {
        throw new RuntimeException('Image processing is unavailable on this server.');
    }

    $fileInfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $fileInfo->file($upload['tmp_name']);
    $imageInfo = @getimagesize($upload['tmp_name']);
    $supportedMimeTypes = ['image/jpeg', 'image/png'];
    if (
        !is_string($mimeType)
        || !in_array($mimeType, $supportedMimeTypes, true)
        || !is_array($imageInfo)
        || !isset($imageInfo[0], $imageInfo[1], $imageInfo['mime'])
        || !in_array($imageInfo['mime'], $supportedMimeTypes, true)
        || $mimeType !== $imageInfo['mime']
    ) {
        throw new InvalidArgumentException('Use a valid JPG or PNG image.');
    }

    $width = (int) $imageInfo[0];
    $height = (int) $imageInfo[1];
    if (
        $width < 1
        || $height < 1
        || $width > PROFILE_PICTURE_MAX_DIMENSION
        || $height > PROFILE_PICTURE_MAX_DIMENSION
        || $width * $height > PROFILE_PICTURE_MAX_PIXELS
    ) {
        throw new InvalidArgumentException('That image is too large to process. Choose a smaller image.');
    }

    $contents = file_get_contents($upload['tmp_name']);
    if (!is_string($contents)) {
        throw new RuntimeException('The uploaded image could not be read.');
    }

    $sourceImage = @imagecreatefromstring($contents);
    if ($sourceImage === false) {
        throw new InvalidArgumentException('The image could not be opened. Choose a different image.');
    }

    try {
        $output = fopen('php://temp', 'w+b');
        if ($output === false) {
            throw new RuntimeException('Unable to prepare the profile picture.');
        }

        try {
            if (!imagejpeg($sourceImage, $output, 86)) {
                throw new RuntimeException('Unable to process the profile picture.');
            }
            rewind($output);
            $jpeg = stream_get_contents($output);
            if (!is_string($jpeg) || $jpeg === '') {
                throw new RuntimeException('Unable to process the profile picture.');
            }
        } finally {
            fclose($output);
        }
    } finally {
        imagedestroy($sourceImage);
    }

    if (strlen($jpeg) > PROFILE_PICTURE_MAX_STORED_BYTES) {
        throw new InvalidArgumentException('The cropped image is too large. Please choose a smaller crop.');
    }

    return $jpeg;
}
