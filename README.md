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

The sample notifications are in [`scripts/messages.json`](./scripts/messages.json)
and are loaded by `scripts/messages.js`. The JSON file must be served over HTTP
or HTTPS (for example, through your PHP server); browsers generally block
`fetch()` from local `file://` pages.
