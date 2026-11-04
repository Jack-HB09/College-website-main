<<<<<<< HEAD
class CookieBannerNotification extends window.MessageNotification {
    constructor() {
        const container = document.createElement("div");
        container.className = "cookie-banner-container";

        super({
            mode: "confirmation",
            type: "privacy",
            title: "Your cookie preferences",
            content: "Choose whether to accept or reject cookies on this site.",
            cancelText: "Reject All",
            confirmText: "Accept All"
        }, container);

        this.overlay = null;
        this.previousBodyOverflow = null;
        this.handleKeydown = event => {
=======
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
>>>>>>> f538fd4135fcea642c8d073674044a224a46f702
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                return;
            }

<<<<<<< HEAD
            if (event.key !== "Tab" || !this.tile) {
                return;
            }

            const focusableElements = [
                this.elements.cancelButton,
                this.elements.confirmButton,
                this.policyLink
            ];
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (event.shiftKey && document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            } else if (!event.shiftKey && document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            } else if (!this.overlay.contains(document.activeElement)) {
                event.preventDefault();
                firstElement.focus();
            }
        };
    }

    hasConsent() {
        return document.cookie.split(";").some(cookie => {
            const value = cookie.trim();
            return value === "site_consent=accepted" || value === "site_consent=declined";
        });
    }

    show() {
        if (this.hasConsent()) {
            this.remove();
            return this;
        }

        super.show();

        const overlay = document.createElement("div");
        overlay.className = "cookie-scrim-backdrop";
        overlay.addEventListener("keydown", this.handleKeydown);

        this.tile.setAttribute("role", "dialog");
        this.tile.setAttribute("aria-modal", "true");
        this.tile.setAttribute("aria-labelledby", "cookie-banner-title");
        this.elements.title.id = "cookie-banner-title";

        this.policyLink = document.createElement("a");
        this.policyLink.className = "cookie-policy-link";
        this.policyLink.href = "legal/cookies.html";
        this.policyLink.textContent = "Read our cookie policy";
        this.tile.appendChild(this.policyLink);

        overlay.appendChild(this.container);
        document.body.appendChild(overlay);
        this.overlay = overlay;
        this.previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        this.elements.cancelButton.focus();
=======
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
>>>>>>> f538fd4135fcea642c8d073674044a224a46f702

        this.response.then(result => {
            if (result === true) {
                document.cookie = "site_consent=accepted; max-age=31536000; path=/";
<<<<<<< HEAD
                this.startTracking();
=======
                startTracking();
>>>>>>> f538fd4135fcea642c8d073674044a224a46f702
            } else if (result === false) {
                document.cookie = "site_consent=declined; max-age=31536000; path=/";
            }
        });

        return this;
    }

<<<<<<< HEAD
    startTracking() {}

    remove() {
        super.remove();

        if (this.overlay) {
            this.overlay.removeEventListener("keydown", this.handleKeydown);
            this.overlay.remove();
            this.overlay = null;
=======
    remove() {
        if (this.keydownHandler) {
            document.removeEventListener("keydown", this.keydownHandler);
        }
        this.keydownHandler = null;

        if (this.scrimElement) {
            this.scrimElement.remove();
            this.scrimElement = null;
>>>>>>> f538fd4135fcea642c8d073674044a224a46f702
        }

        if (this.previousBodyOverflow !== null) {
            document.body.style.overflow = this.previousBodyOverflow;
            this.previousBodyOverflow = null;
        }

<<<<<<< HEAD
        this.elements = null;
        this.tile = null;
        this.policyLink = null;
        this.response = null;

        return this;
=======
        return super.remove();
>>>>>>> f538fd4135fcea642c8d073674044a224a46f702
    }
}

window.CookieBannerNotification = CookieBannerNotification;

<<<<<<< HEAD
new CookieBannerNotification().show();
=======
new CookieBannerNotification({
    content: "We use cookies to improve your experience and analyze site traffic. Choose an option to continue."
}).show();
>>>>>>> f538fd4135fcea642c8d073674044a224a46f702
