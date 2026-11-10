<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers/json-response.php';

function isSameOriginRequest(): bool
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $requestHost = $_SERVER['HTTP_HOST'] ?? '';
    $originParts = parse_url($origin);
    $requestParts = parse_url('http://' . $requestHost);

    if (
        !is_array($originParts)
        || !is_array($requestParts)
        || !isset($originParts['scheme'], $originParts['host'], $requestParts['host'])
        || !in_array(strtolower($originParts['scheme']), ['http', 'https'], true)
    ) {
        return false;
    }

    foreach (['user', 'pass', 'path', 'query', 'fragment'] as $component) {
        if (array_key_exists($component, $originParts) || array_key_exists($component, $requestParts)) {
            return false;
        }
    }

    $isHttps = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== '' && $_SERVER['HTTPS'] !== 'off')
        || (string) ($_SERVER['SERVER_PORT'] ?? '') === '443';
    $expectedScheme = $isHttps ? 'https' : 'http';
    $originScheme = strtolower($originParts['scheme']);
    $originPort = $originParts['port'] ?? ($originScheme === 'https' ? 443 : 80);
    $requestPort = $requestParts['port'] ?? ($isHttps ? 443 : 80);

    return $originScheme === $expectedScheme
        && strtolower($originParts['host']) === strtolower($requestParts['host'])
        && $originPort === $requestPort;
}

function requireSameOriginRequest(): void
{
    if (isSameOriginRequest()) {
        return;
    }

    sendJsonResponse([
        'success' => false,
        'status' => 'error',
        'message' => 'The request origin could not be verified.'
    ], 403);
    exit;
}
