# Task

Create a dedicated `scripts/php/helpers/` folder for small PHP functions that are reused by more than one endpoint. Start with one common function, `sendJsonResponse`, and use it for the login, registration, logout, session-status, and same-origin rejection responses.

A helper function is a named, reusable PHP function that packages a focused operation behind parameters and a consistent result. PHP's manual describes user-defined functions as declarations made with `function`, a name, parameters, and a body. In this project, helper files are included with `require_once` so each endpoint can use the shared function without re-declaring it.

# Constraints

- Keep each API response's existing JSON fields and HTTP status code unchanged; centralize the mechanics, not endpoint-specific behavior.
- Do not add a framework or dependency. The repository has no Composer manifest or established PHP test runner.
- The helper must set the JSON content type, encode the supplied payload, and allow callers to set an HTTP status code.
- Invalid UTF-8 in a response value should be substituted rather than turning the whole response into invalid JSON. Encoding failures must be explicit, not silently emitted as a success-shaped empty response.
- The helper must not terminate the request. Callers remain responsible for `exit` where later endpoint code must not run.
- Local PHP and test tooling are unavailable in the current environment. PHP execution, linting, and integration results must be marked pending rather than reported as passing.
- Add and verify one helper at a time. Do not start another helper until the current helper's tests have passed in a PHP-enabled environment.

# Implementation

PHP's built-in `json_encode` converts a PHP value to JSON. The shared implementation lives in `scripts/php/helpers/json-response.php`:

```php
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
```

The function encodes before writing headers or output. The status parameter defaults to `200`, and values outside the valid HTTP status range are rejected. `JSON_INVALID_UTF8_SUBSTITUTE` is also used by the existing session endpoint, so this implementation does not introduce a newer PHP requirement than that code already had.

Endpoints load the helper once near the top of the file:

```php
require_once __DIR__ . '/helpers/json-response.php';

sendJsonResponse([
    'success' => false,
    'message' => 'Only POST requests are supported.',
], 405);
exit;
```

The helper is now used by the login and registration endpoints, logout and session-status endpoints, and the origin-check rejection path. Endpoint-specific headers such as `Allow` and `Cache-Control` remain with their endpoint logic. Existing response keys and status codes are preserved.

## Why start with this helper

Several PHP endpoints previously repeated `json_encode`, JSON content-type setup, and—where needed—status-code handling. A response helper has a narrow responsibility and is already useful across those endpoints. Origin validation, session initialization, and login throttling are already shared-purpose PHP files; this change does not move or redesign those separate behaviors.

# Testing

The standalone regression test is `scripts/php/tests/json-response-test.php`. In an environment with PHP installed, run:

```powershell
php -l scripts/php/helpers/json-response.php
php -l scripts/php/tests/json-response-test.php
php scripts/php/tests/json-response-test.php
```

The test checks that:

| Case | Expected result |
|---|---|
| Default status and ordinary payload | Status is 200 and decoded JSON matches the supplied payload. |
| Custom status | Status is set to the caller's value (422 in the test). |
| Invalid UTF-8 | The invalid byte is replaced and the result remains decodable JSON. |
| Invalid status | A status outside 100–599 throws `InvalidArgumentException`. |
| Unencodable value | A resource value raises `RuntimeException` and does not produce a response body. |

Also smoke-test each endpoint in a PHP-enabled local/test server: compare the decoded JSON fields and HTTP statuses for success, validation failure, method rejection, origin rejection, and the existing 429/409/500 cases. No production credentials or accounts are needed for the helper's standalone test.

**Results in this environment:** static inspection confirms that the five response-producing PHP files load and call the shared helper, and that direct `json_encode` calls are centralized in the helper. PHP lint and the standalone test could not be run because no PHP executable is installed or available on `PATH`. Therefore this helper is **not yet verified as passing its runtime tests**, and no next helper should be started until the commands above pass.

# Review

## Initial review

- Repeated response encoding and content-type behavior are centralized.
- Endpoint payloads and status codes are retained; status codes are passed through the helper where they were previously set separately.
- The helper reports invalid status and encoding failures instead of returning empty or success-shaped output.
- Requiring the helper does not itself write output or end the request.
- The regression test is dependency-free, but has not been executed locally because PHP is unavailable.

## Final review

The initial helper and its endpoint integrations are in place. Static review found no remaining direct JSON encoding in the API endpoints or origin check. Runtime confidence remains **pending** until PHP lint, the standalone regression test, and the endpoint smoke checks pass in a PHP-enabled environment. No additional helpers have been added.

## References

- [PHP: User-defined functions](https://www.php.net/manual/en/functions.user-defined.php)
- [PHP: `json_encode`](https://www.php.net/manual/en/function.json-encode.php)
