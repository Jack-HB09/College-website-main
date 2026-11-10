<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/json-response.php';

function assertSameValue($expected, $actual, string $message): void
{
    if ($expected !== $actual) {
        throw new RuntimeException($message);
    }
}

http_response_code(200);
ob_start();
sendJsonResponse(['success' => true, 'path' => '/session']);
$responseBody = ob_get_clean();
$responseData = json_decode($responseBody, true);

assertSameValue(
    ['success' => true, 'path' => '/session'],
    $responseData,
    'The helper should emit the supplied payload as JSON.'
);
assertSameValue(200, http_response_code(), 'The default response status should be 200.');

ob_start();
sendJsonResponse(['message' => "bad\xB1value"], 422);
$responseBody = ob_get_clean();
$responseData = json_decode($responseBody, true);

assertSameValue(
    "bad\xEF\xBF\xBDvalue",
    $responseData['message'] ?? null,
    'Invalid UTF-8 should be replaced so the response remains valid JSON.'
);
assertSameValue(422, http_response_code(), 'The supplied response status should be applied.');

try {
    sendJsonResponse([], 99);
    throw new RuntimeException('The helper should reject an invalid HTTP status code.');
} catch (InvalidArgumentException $exception) {
}

$resource = fopen('php://memory', 'r');
if ($resource === false) {
    throw new RuntimeException('Unable to create the JSON encoding failure fixture.');
}

ob_start();
try {
    sendJsonResponse(['resource' => $resource]);
    throw new RuntimeException('The helper should reject values that cannot be JSON-encoded.');
} catch (RuntimeException $exception) {
    if (strpos($exception->getMessage(), 'Unable to encode JSON response:') !== 0) {
        throw $exception;
    }
} finally {
    fclose($resource);
}
$responseBody = ob_get_clean();
assertSameValue('', $responseBody, 'Encoding failures should not produce a response body.');

echo "JSON response helper tests passed.\n";
