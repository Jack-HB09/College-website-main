function hasStoredCookieConsent() {
    return document.cookie.split(";").some(cookie => {
        const value = cookie.trim();
        return value === "site_consent=accepted" || value === "site_consent=declined";
    });
}

class CookieBannerNotification extends MessageNotification {
    constructor(options = {}) {
        const container = document.createElement("div");
        container.className = "cookie-banner-container";

        super({
            mode: "confirmation",
            type: "privacy",
            title: options.title == null ? "Your cookie preferences" : options.title,
            content: options.content == null
                ? "Choose whether to accept or reject cookies on this site."
                : options.content,
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
        }, container);

        this.scrimElement = null;
        this.previousBodyOverflow = null;
        this.previousFocus = null;
        this.keydownHandler = null;
    }

    show() {
        if (hasStoredCookieConsent()) {
            this.remove();
            return this;
        }

        super.show();

        this.previousBodyOverflow = document.body.style.overflow;
        this.previousFocus = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;

        this.scrimElement = document.createElement("div");
        this.scrimElement.className = "cookie-scrim-backdrop";
        this.tile.classList.add("cookie-consent-notification");
        this.tile.setAttribute("role", "dialog");
        this.tile.setAttribute("aria-modal", "true");
        this.tile.setAttribute("aria-labelledby", "cookie-consent-title");
        this.elements.title.id = "cookie-consent-title";

        this.policyLink = document.createElement("a");
        this.policyLink.className = "cookie-policy-link";
        this.policyLink.href = "legal/cookies.html";
        this.policyLink.textContent = "Read our cookie policy";
        this.tile.appendChild(this.policyLink);

        this.scrimElement.appendChild(this.container);
        document.body.appendChild(this.scrimElement);
        document.body.style.overflow = "hidden";

        this.keydownHandler = event => {
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            if (event.key !== "Tab" || !this.scrimElement) {
                return;
            }

            const focusableElements = [...this.elements.buttons, this.policyLink];
            const currentIndex = focusableElements.indexOf(document.activeElement);
            const direction = event.shiftKey ? -1 : 1;
            const nextIndex = currentIndex === -1
                ? (event.shiftKey ? focusableElements.length - 1 : 0)
                : (currentIndex + direction + focusableElements.length) % focusableElements.length;

            event.preventDefault();
            focusableElements[nextIndex].focus();
        };
        document.addEventListener("keydown", this.keydownHandler);
        this.elements.buttons[0].focus();

        this.response.then(result => {
            if (result === true) {
                document.cookie = "site_consent=accepted; max-age=31536000; path=/";
                this.startTracking();
            } else if (result === false) {
                document.cookie = "site_consent=declined; max-age=31536000; path=/";
            }
        });

        return this;
    }

    startTracking() {}

    remove() {
        super.remove();

        if (this.keydownHandler) {
            document.removeEventListener("keydown", this.keydownHandler);
            this.keydownHandler = null;
        }

        if (this.scrimElement) {
            this.scrimElement.remove();
        }
        this.scrimElement = null;

        if (this.previousBodyOverflow !== null) {
            document.body.style.overflow = this.previousBodyOverflow;
            this.previousBodyOverflow = null;
        }

        const previousFocus = this.previousFocus;
        this.previousFocus = null;
        if (previousFocus && previousFocus.isConnected) {
            previousFocus.focus();
        }

        this.elements = null;
        this.tile = null;
        this.response = null;
        this.selectedButton = null;
        this.policyLink = null;
        return this;
    }
}

window.CookieBannerNotification = CookieBannerNotification;

new CookieBannerNotification().show();
