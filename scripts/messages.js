const messageTypes = {
    info: {
        colour: "#2196f3",
        icon: "images/messageicons/info.svg"
    },
    success: {
        colour: "#4caf50",
        icon: "images/messageicons/success.svg"
    },
    warning: {
        colour: "#ff9800",
        icon: "images/messageicons/warning.svg"
    },
    error: {
        colour: "#f44336",
        icon: "images/messageicons/error.svg"
    }
};

class MessageNotification {
    constructor(message, container = document.getElementById("message")) {
        const mode = message.mode ?? "duration";
        if (mode !== "duration" && mode !== "confirmation" && mode !== "sticky") {
            throw new TypeError(`Unsupported notification mode: ${mode}`);
        }

        this.message = message;
        this.mode = mode;
        this.container = container;
        this.tile = null;
        this.elements = null;
        this.timeoutId = null;
        this.response = null;
        this.resolveResponse = null;
    }

    createTile() {
        const tile = document.createElement("div");
        tile.className = "message-tile";

        const icon = document.createElement("img");
        const title = document.createElement("h2");
        title.className = "message-title";

        const content = document.createElement("p");
        content.className = "message-content";

        const text = document.createElement("div");
        text.className = "message-text";
        text.append(title, content);

        tile.append(icon, text);
        this.elements = { icon, title, content };

        if (this.mode === "duration") {
            const timer = document.createElement("div");
            timer.className = "message-Timer";
            tile.append(timer);
            this.elements.timer = timer;
        }else if (this.mode === "confirmation") {
            const actions = document.createElement("div");
            actions.className = "message-actions";

            const cancelButton = document.createElement("button");
            cancelButton.className = "message-button message-button-cancel";
            cancelButton.type = "button";
            cancelButton.textContent = this.message.cancelText ?? "Cancel";

            const confirmButton = document.createElement("button");
            confirmButton.className = "message-button message-button-confirm";
            confirmButton.type = "button";
            confirmButton.textContent = this.message.confirmText ?? "Confirm";

            actions.append(cancelButton, confirmButton);
            tile.append(actions);
            this.elements.actions = actions;
            this.elements.cancelButton = cancelButton;
            this.elements.confirmButton = confirmButton;
        } else if (this.mode === "sticky") {
            tile.classList.add("message-tile-sticky");

            const dismissButton = document.createElement("button");
            dismissButton.className = "message-dismiss";
            dismissButton.type = "button";
            dismissButton.setAttribute("aria-label", this.message.dismissLabel ?? "Dismiss notification");
            dismissButton.textContent = "\u00d7";

            tile.append(dismissButton);
            this.elements.dismissButton = dismissButton;
        }

        return tile;
    }

    populateTile(tile) {
        const type = messageTypes[this.message.type] ?? {
            colour: "#666",
            icon: "images/messageicons/info.svg"
        };
        const duration = this.message.duration ?? 3000;

        tile.style.setProperty("--message-color", type.colour);
        this.elements.icon.src = type.icon;
        this.elements.icon.alt = "";
        this.elements.title.textContent = this.message.title ?? "";
        this.elements.content.textContent = this.message.content ?? "";

        if (this.mode === "duration") {
            tile.style.setProperty("--message-duration", `${duration}ms`);
            this.elements.timer.style.backgroundColor = type.colour;
        }
    }

    renderTile() {
        const tile = this.createTile();
        this.populateTile(tile);
        this.tile = tile;
        return tile;
    }

    show() {
        if (!this.container) {
            throw new Error('Notification container "#message" was not found.');
        }

        this.remove();
        const tile = this.renderTile();
        this.container.appendChild(tile);

        if (this.mode === "duration") {
            const duration = this.message.duration ?? 3000;
            this.timeoutId = setTimeout(() => this.remove(), duration);
        } else if (this.mode === "confirmation") {
            this.response = new Promise(resolve => {
                this.resolveResponse = resolve;
            });
            this.elements.cancelButton.addEventListener("click", () => this.respond(false));
            this.elements.confirmButton.addEventListener("click", () => this.respond(true));
        } else {
            this.elements.dismissButton.addEventListener("click", () => this.remove());
        }

        return this;
    }

    respond(confirmed) {
        if (!this.resolveResponse) {
            return this;
        }

        const resolve = this.resolveResponse;
        this.resolveResponse = null;
        resolve(confirmed);
        return this.remove();
    }

    remove() {
        clearTimeout(this.timeoutId);
        if (this.resolveResponse) {
            const resolve = this.resolveResponse;
            this.resolveResponse = null;
            resolve(null);
        }
        this.tile?.remove();
        return this;
    }
}

window.MessageNotification = MessageNotification;

const testMessages = [
    {
        type: "info",
        title: "Information",
        content: "A new update is available.",
        duration: 3000
    },
    {
        type: "success",
        title: "Success",
        content: "Your profile has been updated successfully.",
        duration: 3000
    },
    {
        type: "warning",
        title: "Low Storage",
        content: "You are running out of storage space.",
        duration: 5000
    },
    {
        type: "error",
        title: "Connection Failed",
        content: "Unable to connect to the server.",
        duration: 5000
    },

    // Edge Cases
    {
        type: "info",
        title: "",
        content: "Message without a title.",
        duration: 3000
    },
    {
        type: "success",
        title: "Empty Content",
        content: "",
        duration: 3000
    },
    {
        type: "warning",
        title: "Very Long Message",
        content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        duration: 8000
    },
    {
        type: "error",
        title: "Instant Dismiss",
        content: "This should disappear almost immediately.",
        duration: 100
    },

    // Confirmation Messages
    {
        mode: "confirmation",
        type: "warning",
        title: "Delete File",
        content: "Are you sure you want to delete this file?",
        confirmText: "Delete",
        cancelText: "Keep"
    },
    {
        mode: "confirmation",
        type: "error",
        title: "Sign Out",
        content: "Do you want to sign out of your account?",
        confirmText: "Sign Out",
        cancelText: "Stay Logged In"
    },
    {
        mode: "confirmation",
        type: "info",
        title: "Save Changes",
        content: "Would you like to save before closing?",
        confirmText: "Save",
        cancelText: "Discard"
    },
    {
        mode: "sticky",
        type: "info",
        title: "Sticky Notification",
        content: "This notification stays open until you dismiss it."
    }
];

testMessages.forEach(message => {
    const notification = new MessageNotification(message).show();

    if (message.mode === "confirmation") {
        notification.response.then(result => {
            console.log(`${message.title}:`, result);
        });
    }
});
