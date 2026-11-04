const loginForm = document.getElementById("login-form");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const messageContainer = document.getElementById("login-messages");

if (
    !loginForm
    || !(usernameInput instanceof HTMLInputElement)
    || !(passwordInput instanceof HTMLInputElement)
    || !messageContainer
    || typeof window.MessageNotification !== "function"
) {
    throw new Error("The login form, message container, or notification class was not found.");
}

const requiredSpecialCharacters = "!@#$%^&*()_+-=[]{}|;:,.<>?";

function getPasswordValidationMessage(password) {
    const requirements = [];

    if ([...password].length < 12) {
        requirements.push("at least 12 characters");
    }
    if (!/[A-Z]/.test(password)) {
        requirements.push("at least one uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
        requirements.push("at least one lowercase letter");
    }
    if (!/[0-9]/.test(password)) {
        requirements.push("at least one number");
    }
    if (![...requiredSpecialCharacters].some(character => password.includes(character))) {
        requirements.push("at least one special character");
    }
    if (/\s/.test(password)) {
        requirements.push("no spaces or other whitespace");
    }

    return requirements.length === 0
        ? ""
        : `Password must contain ${requirements.join(", ")}.`;
}

function showLoginNotification(type, title, content, duration = 4000) {
    new MessageNotification({
        type,
        title,
        content,
        duration
    }, messageContainer).show();
}

passwordInput.addEventListener("input", () => {
    passwordInput.setCustomValidity("");
});

usernameInput.addEventListener("input", () => {
    usernameInput.setCustomValidity("");
});

loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!usernameInput.value.trim()) {
        usernameInput.setCustomValidity("Enter a username.");
        usernameInput.reportValidity();
        return;
    }

    const validationMessage = getPasswordValidationMessage(passwordInput.value);
    passwordInput.setCustomValidity(validationMessage);

    if (validationMessage) {
        showLoginNotification("warning", "Check your password", validationMessage);
        passwordInput.focus();
        return;
    }

    const submitButton = loginForm.querySelector('input[type="submit"]');
    if (!(submitButton instanceof HTMLInputElement)) {
        throw new Error("The login submit button was not found.");
    }

    submitButton.disabled = true;

    try {
        const response = await fetch("scripts/php/login.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                username: usernameInput.value.trim(),
                password: passwordInput.value
            })
        });

        let result;
        try {
            result = await response.json();
        } catch (error) {
            console.error("The login handler returned an invalid JSON response.", {
                status: response.status,
                error
            });
            showLoginNotification("error", "Login failed", "The server returned an invalid response.");
            return;
        }

        if (!result || typeof result !== "object" || Array.isArray(result)) {
            throw new TypeError("The login handler returned an unexpected response.");
        }

        if (!response.ok) {
            const isPasswordValidationFailure = response.status === 422;
            showLoginNotification(
                isPasswordValidationFailure ? "warning" : "error",
                isPasswordValidationFailure ? "Check your password" : "Login failed",
                typeof result.message === "string"
                    ? result.message
                    : "The login request could not be completed."
            );
            return;
        }

        if (result.success !== true || typeof result.message !== "string") {
            showLoginNotification(
                "error",
                "Login failed",
                typeof result.message === "string"
                    ? result.message
                    : "The login handler returned an unexpected response."
            );
            return;
        }

        const redirectDelay = 3000;
        showLoginNotification("success", "Login successful", result.message, redirectDelay);
        passwordInput.value = "";
        window.setTimeout(() => {
            window.location.assign("products.html?login=success");
        }, redirectDelay);
    } catch (error) {
        console.error("Unable to contact the PHP login handler.", error);
        showLoginNotification(
            "error",
            "Login failed",
            error instanceof TypeError
                ? "The server could not be reached or returned an invalid response."
                : "An unexpected error occurred while processing the login."
        );
    } finally {
        submitButton.disabled = false;
    }
});