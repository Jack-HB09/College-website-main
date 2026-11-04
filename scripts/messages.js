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

const buttonFunctions = {
    logButtonClick(title, buttonName) {
        console.log(`${title}: ${buttonName} clicked`);
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
        this.selectedButton = null;

        if (this.mode === "confirmation") {
            if (!Array.isArray(message.buttons) || message.buttons.length === 0) {
                throw new TypeError("Confirmation notifications require at least one button.");
            }
            for (const button of message.buttons) {
                if (!button || typeof button.name !== "string" || typeof button.action !== "string" ||
                    button.action.trim() === "" || typeof button.result !== "boolean" ||
                    typeof button.function !== "string" || typeof buttonFunctions[button.function] !== "function" ||
                    (button.style !== undefined && button.style !== "confirm" && button.style !== "cancel")) {
                    throw new TypeError("Each confirmation button requires a name, action ID, registered function, boolean result, and optional confirm/cancel style.");
                }
            }
        }
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

            const buttons = this.message.buttons.map(buttonConfig => {
                const button = document.createElement("button");
                button.className = `message-button message-button-${buttonConfig.style ?? "confirm"}`;
                button.type = "button";
                button.textContent = buttonConfig.name;
                button.addEventListener("click", () => {
                    this.selectedButton = buttonConfig;
                    buttonFunctions[buttonConfig.function](this.message.title ?? "", buttonConfig.name);
                    this.respond(buttonConfig.result);
                });
                actions.append(button);
                return button;
            });

            tile.append(actions);
            this.elements.actions = actions;
            this.elements.buttons = buttons;
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

async function showMessagesFromJson() {
    const messagesUrl = new URL("messages.json", document.currentScript.src);
    const response = await fetch(messagesUrl);
    if (!response.ok) {
        throw new Error(`Failed to load notification data: ${response.status} ${response.statusText}`);
    }

    testMessages.forEach(async(message) => {
        const notification = new MessageNotification(message).show();

        const messages = await response.json();
        if (!Array.isArray(messages)) {
            throw new TypeError("Notification data must be a JSON array.");
        }
    });

    messages.forEach(message => {
        new MessageNotification(message).show();
    });
};

if (document.getElementById("message")) {
    showMessagesFromJson().catch(error => {
        console.error("Unable to display notification data.", error);
    });
}
