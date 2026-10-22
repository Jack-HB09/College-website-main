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
    confirmText: "Delete",
    cancelText: "Keep it"
}).show();

confirmation.response.then(confirmed => {
    if (confirmed) {
        // Perform the confirmed action.
    }
});

const sticky = new MessageNotification({
    mode: "sticky",
    type: "info",
    title: "Still working",
    content: "Dismiss this when you are ready."
}).show();
```

Confirmation responses are `true` for confirm, `false` for cancel, and `null` if
the notification is removed programmatically. Sticky notifications can also be
removed in code with `sticky.remove()`. Timed notifications use `duration` in
milliseconds and default to 3000 ms.
