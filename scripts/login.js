const loginForm = document.querySelector("form");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

if (
    !loginForm
    || !(usernameInput instanceof HTMLInputElement)
    || !(passwordInput instanceof HTMLInputElement)
) {
    throw new Error("The login form or its inputs were not found.");
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

    if (requirements.length === 0) {
        return "";
    }

    return `Password must contain ${requirements.join(", ")}.`;
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
        passwordInput.reportValidity();
        return;
    }

    const submitButton = loginForm.querySelector('input[type="submit"]');
    if (!(submitButton instanceof HTMLInputElement)) {
        throw new Error("The login submit button was not found.");
    }

    submitButton.disabled = true;

    try {
        const response = await fetch(loginForm.action, {
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
            return;
        }

        console.log("Login response:", result);
        if (!response.ok) {
            console.error("The login request failed.", {
                status: response.status,
                response: result
            });
            return;
        }
        if (typeof result.message !== "string") {
            console.error("The login handler returned an unexpected response.", result);
            return;
        }

        passwordInput.value = "";
    } catch (error) {
        console.error("Unable to contact the PHP login handler.", error);
    } finally {
        submitButton.disabled = false;
    }
});