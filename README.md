# College-website
just a small website that i am making whiel learning webdevelop ment. wil try to get this on my server and get a URL via NGROK.

## Notifications

Create a `MessageNotification` with `mode: "duration"` to dismiss it automatically, or
`mode: "confirmation"` to wait for the user to choose an action:

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
```

Confirmation responses are `true` for confirm, `false` for cancel, and `null` if
the notification is removed programmatically. Timed notifications use `duration`
in milliseconds and default to 3000 ms.
