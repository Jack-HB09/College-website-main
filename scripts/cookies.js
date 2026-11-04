function hasStoredCookieConsent() {
    return document.cookie.split(";").some(cookie => {
        const value = cookie.trim();
        return value === "site_consent=accepted" || value === "site_consent=declined";
    });
}

function startTracking() {
}

class CookieBannerNotification extends MessageNotification {
    constructor(options = {}) {
        const messageContainer = document.createElement("div");
        messageContainer.className = "cookie-message-container";

        super({
            title: options.title ?? "We Value Your Privacy",
            content: options.content ?? "We use cookies to improve your experience and analyze site traffic. Choose an option to continue.",
            mode: "confirmation",
            type: "privacy",
            buttons: [
                {
                    name: "Reject All",
                    action: "decline_cookies",
                    function: "logButtonClick",
                    style: "cancel",
                    result: false
                },
                {
                    name: "Accept All",
                    action: "accept_cookies",
                    function: "logButtonClick",
                    style: "confirm",
                    result: true
                }
            ]
        }, messageContainer);

        this.hasConsent = hasStoredCookieConsent();
        this.scrimElement = null;
        this.previousBodyOverflow = null;
        this.keydownHandler = null;
    }

    show() {
        if (this.hasConsent) {
            return this;
        }

        super.show();

        this.previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        this.scrimElement = document.createElement("div");
        this.scrimElement.className = "cookie-scrim-backdrop";
        this.container.classList.add("cookie-message-container");
        this.tile.classList.add("cookie-consent-notification");
        this.tile.setAttribute("role", "dialog");
        this.tile.setAttribute("aria-modal", "true");
        this.tile.setAttribute("aria-labelledby", "cookie-consent-title");
        this.elements.title.id = "cookie-consent-title";

        const buttons = this.elements.buttons;
        this.keydownHandler = event => {
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            if (event.key === "Tab") {
                event.preventDefault();
                const currentIndex = buttons.indexOf(document.activeElement);
                const nextIndex = currentIndex === -1
                    ? (event.shiftKey ? buttons.length - 1 : 0)
                    : (currentIndex + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
                buttons[nextIndex].focus();
            }
        };
        document.addEventListener("keydown", this.keydownHandler);

        this.scrimElement.appendChild(this.container);
        document.body.appendChild(this.scrimElement);
        buttons[0].focus();

        this.response.then(result => {
            if (result === true) {
                document.cookie = "site_consent=accepted; max-age=31536000; path=/";
                startTracking();
            } else if (result === false) {
                document.cookie = "site_consent=declined; max-age=31536000; path=/";
            }
        });

        return this;
    }

    remove() {
        if (this.keydownHandler) {
            document.removeEventListener("keydown", this.keydownHandler);
        }
        this.keydownHandler = null;

        if (this.scrimElement) {
            this.scrimElement.remove();
            this.scrimElement = null;
        }

        if (this.previousBodyOverflow !== null) {
            document.body.style.overflow = this.previousBodyOverflow;
            this.previousBodyOverflow = null;
        }

        return super.remove();
    }
}

window.CookieBannerNotification = CookieBannerNotification;

new CookieBannerNotification({
    content: "We use cookies to improve your experience and analyze site traffic. Choose an option to continue."
}).show();
