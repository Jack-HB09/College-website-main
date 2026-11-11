# Password recovery and security questions

## What changed

The login page now offers a password reset flow, and the signed-in account page provides both recovery-question setup and password reset controls. Recovery questions are stored in `scripts/security-questions.json` as a JSON object whose numeric string keys map to question text:

```json
{
    "1": "What was the name of your first school?"
}
```

The account owner chooses a question from the dropdown and enters a free-text answer. The server trims surrounding whitespace and stores the answer with PHP's `PASSWORD_ARGON2ID` hash; it does not store the plain answer. Answer matching is case-sensitive. Changing the question is permitted for a signed-in user without re-entering their password, as requested.

When signed out, the user enters an email address to load its recovery question. The answer, new password, and confirmation are then submitted together in one password-reset request. The answer is never submitted separately from the password change. A signed-in user does not need to enter an email; the PHP session's user ID is used instead.

All requests use JSON POST bodies, same-origin checks, prepared SQL statements, and the current PHP session helpers. The existing JSON and origin helpers accept an optional generic public error message for this flow while retaining their existing messages for other callers. The existing login handler's selected `user_id` is also stored consistently in the session so the signed-in recovery endpoints can use it. Notifications use `MessageNotification`; the flow does not send email. After a successful password change, the current session is destroyed and the user must sign in again. The existing application does not maintain a registry of all active sessions, so this change cannot revoke sessions on other devices.

## Limits and database setup

- Five incorrect recovery-answer submissions are permitted per account per UTC calendar day. The next submission is refused until the next UTC day. Attempts for unknown accounts share a separate placeholder bucket and do not persist submitted email addresses.
- One successful password change is permitted per account per UTC calendar month.
- The monthly timestamp and daily attempt counters are stored in UTC and serialized with database row locks/transactions.
- `scripts/php/migrations/004_create_password_recovery_tables.sql` creates `user_infomation`, `password_reset_limits`, and `password_reset_attempts` when missing.
- `scripts/php/migrations/005_add_profile_picture_to_user_infomation.sql` extends the same `user_infomation` table with a profile-picture BLOB and makes the recovery fields nullable so a user may save a profile picture before enrolling a recovery question.
- This repository does not include the live database schema. Before applying the migration, inspect `user_infomation` on the target database. `CREATE TABLE IF NOT EXISTS` does not add missing columns to an existing table; verify it has `user_id`, `security_question`, and `security_answer` with compatible types, and adapt the migration if necessary. Also verify the deployed `users.user_id` type and the database engine supports InnoDB transactions.

The question itself is retrievable by email through the specified recovery flow, so this mechanism is not equivalent to a private second factor. Security-question answers can often be guessed or found publicly. Use a unique answer that is not already known about you. HTTPS is required in deployment to protect the JSON request bodies in transit.

## Files and responsibilities

| File | Responsibility |
|---|---|
| `scripts/security-questions.json` | IDs and prompt text shared by the client and PHP. |
| `scripts/password-recovery.js` | Question setup, prompt lookup, validation, one-shot reset submission, and existing notifications. |
| `scripts/php/security-question.php` | Authenticated setup/change and answer hashing. |
| `scripts/php/password-reset-question.php` | Resolve the account from session ID or email and return its prompt. |
| `scripts/php/password-reset.php` | Verify answer and matching question ID, enforce daily/monthly limits, update the password hash, and end the current session. |
| `scripts/php/password-recovery-common.php` | Shared validation, question loading, account lookup, and session helpers. |
| `scripts/php/helpers/json-request.php` and `scripts/php/origin-check.php` | Existing helpers with optional friendly error text for recovery endpoints; existing callers retain their default behavior. |
| `scripts/php/migrations/004_create_password_recovery_tables.sql` | Recovery-question and reset-limit tables. |
| `scripts/php/tests/password-recovery-test.php` | Local tests for shared policy/normalization/hash behavior. |

## Tests and results

### Local checks

| Check | Result |
|---|---|
| Password recovery helper tests (`php scripts/php/tests/password-recovery-test.php`) | Not run locally: PHP is not installed or available on PATH. |
| PHP syntax checks for the three endpoints and shared helper | Not run locally: PHP is not installed or available on PATH. Run `php -l` on each PHP file before deployment. |
| MySQL migration and endpoint integration | Not run locally: no PHP/MySQL runtime or disposable test database is available. |
| Browser interaction and accessibility checks | Not run locally: no browser automation tool/runtime is available in this workspace. |
| Static review of endpoint inputs | Reviewed: request values are type-checked; question IDs are checked against the JSON map; answer and password lengths/policy are validated server-side. |
| Static review of storage and SQL | Reviewed: prepared statements are used; recovery answers are Argon2id hashes; password updates use the existing Argon2id password hash field; database row locks and transactions protect limits. |
| Static markup and JSON question data | Passed with a PowerShell static check: both pages have unique IDs, labels point to existing controls, referenced local assets exist, login/recovery forms use POST, recovery forms opt into message-based validation, and question IDs/text are valid. |
| `git diff --check` | Passed after implementation. |
| Outbound email behavior | Reviewed: no email sending code is added or called. |

### Required disposable-database verification

Run these checks against a disposable database after confirming the deployed schema and applying the migration. Do not use real accounts or passwords.

| Test | Expected result |
|---|---|
| Apply migration 004 on an empty test database | The three recovery tables are created successfully. |
| Apply migration 005 after migration 004 | `user_infomation` gains a nullable `profile_picture` BLOB column, and the recovery fields become nullable. |
| Apply migration where `user_infomation` already exists | No existing rows are overwritten; manually verify/extend the table to provide the required columns before using recovery. |
| Save a security question while signed in | The selected ID and non-plaintext Argon2id answer hash are stored for the session user; the success notification appears. |
| Verify a recovery answer with surrounding whitespace | The surrounding whitespace is trimmed consistently before hashing and verification; letter case remains significant. |
| Try to save a question while signed out or with an unknown ID/empty answer | The request is refused with a non-technical error notification and no row is written. |
| Load a prompt with the registered email | The expected text and numeric ID are returned; response caching is disabled. |
| Load a prompt for an unknown email or account without a recovery question | A generic user-facing error appears; no email is sent. |
| Submit an incorrect answer five times for a disposable account | Each failure displays a generic error; the sixth attempt is refused with HTTP 429 until the next UTC date. |
| Submit an incorrect answer for multiple unknown addresses | The attempts share the unknown-account bucket; submitted email addresses are not stored in the attempt table. |
| Submit a mismatched question ID with the correct answer | The reset is refused and counted as a failed answer. |
| Submit a correct answer, compliant new password, and matching confirmation in one request | The password hash changes, `last_reset_at` is set in UTC, the active session is destroyed, and the success notification appears. |
| Submit a weak or mismatched new password | The form shows a human-readable notification and the server does not update the password. |
| Attempt a second successful change in the same UTC month | The request is refused with a user-friendly monthly-limit message. |
| Attempt a successful change in the next UTC calendar month | The reset is allowed if the recovery answer is correct and the daily limit is not exhausted. |
| Signed-in reset from `accounts.html` | The email field is omitted; the user ID comes from the session; successful reset redirects to login after the notification. |
| Send cross-origin or non-POST requests to the endpoints | The request is rejected by the existing method and same-origin protections. |
| Inspect HTML output and responses | User text is inserted with `textContent`; JSON responses do not disclose SQL errors, hashes, or debug details. |
| Review outgoing network requests | No email provider or outbound mail request is contacted. |

## Deployment notes

Apply the schema migration only after checking the live `user_infomation` structure and making a backup. Confirm HTTPS is enabled. Run the PHP lint and helper tests above, then complete every disposable-database check before enabling recovery for real users. The daily counter is keyed by account ID (unknown identities share a non-account bucket); it is not an IP-based denial-of-service control.
