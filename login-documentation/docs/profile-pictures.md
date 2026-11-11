# Task

Let signed-in users choose a profile picture by selecting an image or dragging it onto the account page. Show the image in a movable circular crop window, let the user position the circle with the mouse (or keyboard), then save the selected crop in `user_infomation` for the signed-in user.

The feature spans:

- `accounts.html` and `style/profile-picture.css` for the image preview, drop target, and crop window.
- `scripts/profile-picture.js` for file handling, crop positioning, canvas export, upload, and preview refresh.
- `scripts/php/profile-picture.php` and `scripts/php/profile-picture-common.php` for authenticated image storage and retrieval.
- `scripts/php/migrations/005_add_profile_picture_to_user_infomation.sql` for the database column.
- `scripts/main.js` for showing the account picture in the account navigation.
- `scripts/php/tests/profile-picture-test.php` and this document for validation and test records.

Password recovery also uses `user_infomation`; its implementation and database requirements are documented in [password-recovery.md](./password-recovery.md). Profile pictures can be saved even if the user has not enrolled a recovery question.

# Constraints

## Image selection and crop

- Accept JPEG and PNG images only, through either the native file chooser or drag-and-drop.
- Prevent a dropped file from opening or navigating the browser window.
- The circular crop must remain inside the image. Move it by dragging with the mouse or touch; keyboard arrow keys also move it for accessibility. There are no crop sliders.
- Create a square 512 × 512 JPEG locally with the browser canvas. Only the cropped result is uploaded.
- Limit the original upload to 8 MiB, each dimension to 8,000 pixels, total dimensions to 12 million pixels, and the normalized stored image to 2 MiB.

## Server and database

- Accept uploads only from a signed-in session and derive the owner from `$_SESSION['user_id']`; never accept a client-supplied user ID.
- Use the existing same-origin check on POST uploads. Retrieve only the current signed-in user's image.
- Do not trust the filename or browser-supplied MIME type. Inspect image content and dimensions on the server, decode the image, and re-encode it as JPEG before storage.
- Store image bytes in `user_infomation.profile_picture`; do not save user uploads in the web root.
- The server requires PHP GD and Fileinfo extensions. PHP upload and post body limits must allow the documented input size and multipart overhead.
- Do not send email or expose image bytes or server diagnostics in user-facing messages.

# Implementation

## Browser flow

The visible label is associated with a file input, so it supports click-to-select as well as file dropping. Drag/drop handlers accept files on the target and cancel the browser's default file-open behavior. The browser checks the type, size, and decoded dimensions before showing the crop UI.

The image is previewed from a temporary object URL. The circular selection is clamped to the image bounds and follows pointer movement; the arrow keys can move it in small increments, with Shift increasing the step. The selected rectangle is drawn to a 512 × 512 canvas and encoded as JPEG. The original image is not uploaded.

The browser sends the cropped Blob in a multipart `POST` to `scripts/php/profile-picture.php`. After a successful JSON response, it refreshes the account-page preview and the signed-in account-navigation icon. Errors are displayed using the existing `MessageNotification` system.

This follows the file-drop pattern in [MDN's file drag-and-drop guide](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop) and uses the Canvas [`drawImage()` API](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage) to extract the chosen crop.

## PHP and storage

The PHP endpoint accepts `POST` and `GET` only:

- `POST` verifies the same origin, checks that the session is authenticated, validates the upload and stores the normalized bytes using a prepared statement.
- `GET` verifies the session and returns only the picture for that session's user ID. Missing pictures return `404`, allowing the browser to show the default account icon.

Server-side upload validation checks PHP's upload status, the maximum byte length, Fileinfo MIME type, image signature and dimensions. It decodes supported JPEG/PNG content using GD and re-encodes it as JPEG. The image is retrieved with `Cache-Control: no-store, private`, `X-Content-Type-Options: nosniff`, and a restrictive content-security policy.

The upload checks and safe storage approach follow OWASP's [File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html): allowlist required formats, enforce size limits, verify content instead of trusting client metadata, authorize users, and avoid storing user-controlled files in the web root.

## Database setup

Apply `scripts/php/migrations/005_add_profile_picture_to_user_infomation.sql` after the recovery schema migration. The `user_infomation` table needs `user_id`, nullable `security_question INT UNSIGNED`, nullable `security_answer VARCHAR(255)`, and nullable `profile_picture MEDIUMBLOB` columns.

Migration 005 assumes migration 004 has created `user_infomation` and the security-question columns. It makes the recovery fields nullable so a user can save a profile picture before setting a recovery question. Confirm the deployed column types and back up the database before applying schema changes. `user_id` must match the type of `users.user_id`.

Configure PHP `upload_max_filesize` to at least 8 MiB and `post_max_size` above 8 MiB to allow multipart overhead (for example 9 MiB). Ensure the server has GD and Fileinfo enabled and sufficient memory for decoding images up to 12 megapixels.

## Files and responsibilities

| File | Responsibility |
|---|---|
| `accounts.html` | Profile picture display, file drop/picker, and crop controls. |
| `scripts/profile-picture.js` | File handling, mouse/keyboard crop movement, canvas export, upload, and image refresh. |
| `style/profile-picture.css` | Drop area, responsive preview, circular crop overlay, and accessible focus states. |
| `scripts/main.js` | Shows the signed-in user's picture in account navigation, with a default icon fallback. |
| `scripts/php/profile-picture.php` | Session-bound upload and retrieval API. |
| `scripts/php/profile-picture-common.php` | Session owner lookup, upload limits, content checks, and JPEG re-encoding. |
| `scripts/php/migrations/005_add_profile_picture_to_user_infomation.sql` | Adds the image BLOB and allows recovery fields to be unset. |
| `scripts/php/tests/profile-picture-test.php` | CLI tests for limits and missing/oversized upload rejection. |

# Testing

## Results in this environment

| Check | Result |
|---|---|
| Account page markup, IDs, labels, and local assets | Passed static PowerShell checks. |
| Cropper script include | Passed static check; the profile picture script is included once. |
| `git diff --check` | Passed after the change. |
| Browser file-picker and crop/canvas check | Passed in the integrated browser using a generated 640 × 480 red/blue test image and mocked upload response. The crop produced a 512 × 512 JPEG; the output center pixel matched the selected image region. |
| Browser mouse pointer movement | Passed in the integrated browser: dragging the circle moved the selected crop and the circle remained within the image. |
| Browser keyboard crop movement | Passed in the integrated browser: the arrow key moved the selected crop. |
| Browser drag/drop | Passed in the integrated browser: a generated PNG drop opened the cropper and prevented the browser default action. |
| Unsupported-file rejection | Passed in the integrated browser: a text file was rejected with a user-facing JPG/PNG message. |
| Crop sliders | Confirmed absent from the HTML, CSS, and JavaScript, and no range inputs appear in the rendered cropper. Dragging and arrow-key movement both passed. |
| PHP tests and lint | Not run locally: PHP is not installed or available on `PATH`. |
| Real PHP/MySQL upload and retrieval | Not run: this workspace has no PHP/MySQL server. The browser upload success response was mocked and did not store an image. |

Run PHP checks in a PHP-enabled environment:

```powershell
php -l scripts/php/profile-picture.php
php -l scripts/php/profile-picture-common.php
php -l scripts/php/tests/profile-picture-test.php
php scripts/php/tests/profile-picture-test.php
```

## Disposable-account integration test plan

Use a test database and test account, never production accounts or images.

| Area | Test | Expected result |
|---|---|---|
| Schema | Apply migration 005 after migration 004. | `profile_picture` is a nullable `MEDIUMBLOB`; the two recovery fields are nullable. |
| File chooser | Select a valid JPG and PNG. | The crop preview opens, and the original image stays local. |
| Drag-and-drop | Drop a valid JPG/PNG on the drop target and a non-image elsewhere on the page. | Valid images open the crop preview; file drops do not navigate away or open in the browser. |
| Crop movement | Drag the circle with mouse/touch toward every edge of the source image. | The circle moves smoothly, stays inside the image, and the saved crop matches its selected area. |
| Keyboard movement | Focus the crop circle and use arrow keys and Shift+arrow. | The crop moves in small steps and larger Shift-modified steps without going outside the image. |
| File limits | Upload a file over 8 MiB or an image above the dimension/pixel limits. | The server rejects it with a user-friendly message; the previously saved picture is unchanged. |
| Content validation | Upload a renamed text file, SVG, or invalid/truncated image. | The server rejects it even if the filename or client MIME type claims it is JPEG/PNG. |
| Successful upload | Crop a supported image and save. | The server stores normalized JPEG bytes for the session user; the preview and navigation icon update. |
| Reload | Reload the signed-in account page. | The saved image is retrieved and shown again. |
| Authorization | Upload without a session and request the image under another user session. | Upload is denied; retrieval only returns the current session owner's picture. |
| Response protections | Inspect the image response headers and browser console. | The response is private/no-store, is marked `nosniff`, and exposes no server errors. |

# Review

- Only a server-verified JPEG is stored; client metadata and filenames are not used to select the server-side format.
- Upload and retrieval ownership is session-derived and SQL uses prepared statements.
- Temporary browser object URLs are revoked when the cropper closes or a new image is selected.
- The crop circle is clamped to the decoded image boundaries, and source size limits are checked in both browser and PHP.
- Mouse/touch dragging remains the primary crop control. Sliders were removed; keyboard movement remains available.
- PHP/MySQL behavior still needs linting and disposable-database integration tests before deployment.

# References

- [MDN: File drag and drop](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop)
- [MDN: CanvasRenderingContext2D.drawImage](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage)
- [OWASP: File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
