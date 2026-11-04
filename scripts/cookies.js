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
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                return;
            }

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

        if (this.overlay) {
            this.overlay.removeEventListener("keydown", this.handleKeydown);
            this.overlay.remove();
            this.overlay = null;
        }

        if (this.previousBodyOverflow !== null) {
            document.body.style.overflow = this.previousBodyOverflow;
            this.previousBodyOverflow = null;
        }

        this.elements = null;
        this.tile = null;
        this.policyLink = null;
        this.response = null;

        return this;
    }
}

window.CookieBannerNotification = CookieBannerNotification;

new CookieBannerNotification().show();
