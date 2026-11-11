# College-website
just a small website that i am making whiel learning webdevelop ment. wil try to get this on my server and get a URL via NGROK.

## Notifications

Create a `MessageNotification` with `mode: "duration"` to dismiss it automatically,
`mode: "confirmation"` to wait for a choice, or `mode: "sticky"` to keep it visible
until the user closes it:

```js
const confirmation = new MessageNotification({
    mode: "confirmation",
    type: "warning",
    title: "Delete item?",
    content: "This action cannot be undone.",
    buttons: [
        {
            name: "Keep it",
            action: "keep_item",
            function: "logButtonClick",
            style: "cancel",
            result: false
        },
        {
            name: "Delete",
            action: "delete_item",
            function: "logButtonClick",
            style: "confirm",
            result: true
        }
    ]
}).show();

confirmation.response.then(confirmed => {
    console.log("Selected button:", confirmation.selectedButton.name);
    console.log("Backend action ID:", confirmation.selectedButton.action);
    if (confirmed) {
        // Later, send the selected action ID to your PHP endpoint here.
    }
});

const sticky = new MessageNotification({
    mode: "sticky",
    type: "info",
    title: "Still working",
    content: "Dismiss this when you are ready."
}).show();
```

Confirmation button data is plain JSON: each button has a `name`, an `action`
identifier for the backend, a `function` name, a boolean `result`, and an
optional `style` (`"confirm"` or `"cancel"`). The function name refers to a
handler registered in `scripts/messages.js`; `logButtonClick` logs the
notification title and button name. JSON cannot contain executable JavaScript
functions, so unknown function names are rejected rather than evaluated. The
selected button's backend action identifier is available at
`confirmation.selectedButton.action`. The response is `true` or `false` based
on the clicked button's `result`, or `null` if the notification is removed
programmatically. Sticky notifications can also be removed in code with
`sticky.remove()`. Timed notifications use `duration` in milliseconds and
default to 3000 ms.

Notifications are loaded from `scripts/messages.json` by `scripts/messages.js`;
the file is empty by default so demo notifications do not interrupt normal
shopping. The JSON file must be served over HTTP or HTTPS (for example, through
your PHP server); browsers generally block `fetch()` from local `file://` pages.

## Running the shop and account pages

Serve the repository through PHP so the login, registration, session-status,
and sign-out endpoints can run. From the repository directory, use
`php -S localhost:8000` and open `http://localhost:8000/products.html`. PHP is
required; opening the HTML files directly with `file://` does not run the
account endpoints.

Before registering accounts, apply
[`scripts/php/migrations/001_add_email_to_users.sql`](./scripts/php/migrations/001_add_email_to_users.sql)
to the database containing the `users` table. It adds a unique email column;
existing users will have no email until you update their records. Also apply
[`scripts/php/migrations/002_create_login_attempts.sql`](./scripts/php/migrations/002_create_login_attempts.sql)
to create the initial table for login-attempt throttling. Apply
[`scripts/php/migrations/003_key_login_attempts_by_username.sql`](./scripts/php/migrations/003_key_login_attempts_by_username.sql)
after migration 002 to use username-only throttling. Migration 003 clears
temporary throttling counters and removes the IP-address column. Do not apply
migration 003 if the table has already been manually changed to use only
`username_hash` as its primary key.

The fixed demo account is:

- Username: `test`
- Password: `DemoCollege!2026`

The demo account is hard-coded for learning and demonstration only. The
registration form stores usernames, email addresses, and password hashes in
the database. This project is for learning and must not be deployed with real
user data or credentials. The basket is stored in the browser's local storage;
checkout and order processing are not implemented.
