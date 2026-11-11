<?php
declare(strict_types=1);

require_once __DIR__ . '/../profile-picture-common.php';

function assertProfilePictureSame($expected, $actual, string $message): void
{
    if ($expected !== $actual) {
        throw new RuntimeException($message);
    }
}

assertProfilePictureSame(8388608, PROFILE_PICTURE_MAX_UPLOAD_BYTES, 'The upload limit should be 8 MiB.');
assertProfilePictureSame(12000000, PROFILE_PICTURE_MAX_PIXELS, 'Image decoding should have a pixel-count limit.');
assertProfilePictureSame(8000, PROFILE_PICTURE_MAX_DIMENSION, 'Image decoding should have a dimension limit.');
assertProfilePictureSame(2097152, PROFILE_PICTURE_MAX_STORED_BYTES, 'The normalized image should have a storage limit.');

$invalidUpload = [
    'error' => UPLOAD_ERR_INI_SIZE,
    'tmp_name' => '',
    'size' => 0
];

try {
    normalizeProfilePictureUpload($invalidUpload);
    throw new RuntimeException('An upload rejected by PHP should not be processed.');
} catch (InvalidArgumentException $exception) {
    assertProfilePictureSame(
        'That image is too large. Choose a smaller image.',
        $exception->getMessage(),
        'An oversized image should produce a useful message.'
    );
}

try {
    normalizeProfilePictureUpload([]);
    throw new RuntimeException('A missing image should not be processed.');
} catch (InvalidArgumentException $exception) {
    assertProfilePictureSame(
        'Choose an image file and try again.',
        $exception->getMessage(),
        'A missing upload should produce a useful message.'
    );
}

echo "Profile picture validation tests passed.\n";
