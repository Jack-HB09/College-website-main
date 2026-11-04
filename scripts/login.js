const loginForm = document.querySelector("form");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginStatus = document.getElementById("login-status");

if (
    !loginForm
    || !(usernameInput instanceof HTMLInputElement)
    || !(passwordInput instanceof HTMLInputElement)
    || !(loginStatus instanceof HTMLElement)
) {
    throw new Error("The login form, its inputs, or status message was not found.");
}

const requiredSpecialCharacters = "!@#$%^&*()_+-=[]{}|;:,.<>?";

function getPasswordValidationMessage(password) {
    const requirements = [];

    if (password.length < 12) {
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

    if (requirements.length === 0) {
        return "";
    }

    return `Password must contain ${requirements.join(", ")}.`;
}

passwordInput.addEventListener("input", () => {
    passwordInput.setCustomValidity("");
});

loginForm.addEventListener("submit", event => {
    event.preventDefault();
    const validationMessage = getPasswordValidationMessage(passwordInput.value);
    passwordInput.setCustomValidity(validationMessage);

    if (validationMessage) {
        passwordInput.reportValidity();
        return;
    }

    const submitButton = loginForm.querySelector('input[type="submit"]');
    if (!(submitButton instanceof HTMLInputElement)) {
        throw new Error("The login submit button was not found.");
    }

    submitButton.disabled = true;
    loginStatus.textContent = "Submitting login details…";

    fetch(loginForm.action, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({
            username: usernameInput.value,
            password: passwordInput.value
        })
    })
        .then(async response => {
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || "The login request could not be processed.");
            }
            if (typeof result.message !== "string") {
                throw new Error("The login handler returned an invalid response.");
            }

            const usernameMessage = typeof result.username === "string"
                ? `Username ${result.username} received. `
                : "";
            loginStatus.textContent = `${usernameMessage}${result.message}`;
            passwordInput.value = "";
        })
        .catch(error => {
            loginStatus.textContent = error instanceof TypeError
                ? "Unable to contact the PHP login handler. Make sure the site is running on a PHP-enabled server."
                : error.message;
        })
        .finally(() => {
            submitButton.disabled = false;
        });
});