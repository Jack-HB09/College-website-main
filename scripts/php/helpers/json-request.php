<?php
declare(strict_types=1);

require_once __DIR__ . '/json-response.php';

function readJsonRequestBody(?string $publicErrorMessage = null, ?callable $onDiagnostic = null): array
{
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    $mediaType = strtolower(trim(explode(';', $contentType, 2)[0]));

    if ($mediaType !== 'application/json') {
        if ($onDiagnostic !== null) {
            $onDiagnostic('invalid_content_type');
        }
        sendJsonResponse([
            'success' => false,
            'status' => 'error',
            'message' => $publicErrorMessage ?? 'Content-Type must be application/json.'
        ], 415);
        exit;
    }

    $rawBody = file_get_contents('php://input');
    if ($rawBody === false || $rawBody === '') {
        if ($onDiagnostic !== null) {
            $onDiagnostic('empty_request_body');
        }
        sendJsonResponse([
            'success' => false,
            'status' => 'error',
            'message' => $publicErrorMessage ?? 'A JSON request body is required.'
        ], 400);
        exit;
    }

    $request = json_decode($rawBody);
    if (json_last_error() !== JSON_ERROR_NONE) {
        if ($onDiagnostic !== null) {
            $onDiagnostic('invalid_json');
        }
        sendJsonResponse([
            'success' => false,
            'status' => 'error',
            'message' => $publicErrorMessage ?? 'The request body must contain valid JSON.'
        ], 400);
        exit;
    }

    if (!$request instanceof stdClass) {
        if ($onDiagnostic !== null) {
            $onDiagnostic('json_body_not_object');
        }
        sendJsonResponse([
            'success' => false,
            'status' => 'error',
            'message' => $publicErrorMessage ?? 'The JSON request body must be an object.'
        ], 400);
        exit;
    }

    return get_object_vars($request);
}
