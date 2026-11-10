<?php
declare(strict_types=1);

function sendJsonResponse(array $payload, int $statusCode = 200): void
{
    if ($statusCode < 100 || $statusCode > 599) {
        throw new InvalidArgumentException('HTTP status code must be between 100 and 599.');
    }

    $encodedPayload = json_encode(
        $payload,
        JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE
    );
    if ($encodedPayload === false) {
        throw new RuntimeException('Unable to encode JSON response: ' . json_last_error_msg());
    }

    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo $encodedPayload;
}
