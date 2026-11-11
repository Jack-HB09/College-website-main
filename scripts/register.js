const registerForm = document.getElementById("register-form");
const usernameInput = document.getElementById("username");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirm-password");
const messageContainer = document.getElementById("login-messages");
const registrationEndpoint = new URL("php/register.php", document.currentScript.src);

function showRegistrationNotification(type, title, content) {
    new MessageNotification({
        type,
        title,
        content
    }, messageContainer).show();
}

function isPasswordValid(password) {
    return password.length >= 8
        && /[A-Z]/.test(password)
        && /[a-z]/.test(password)
        && /\d/.test(password)
        && /[!@#$%^&*(),.?":{}|<>]/.test(password);
}

registerForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!usernameInput.value.trim()) {
        showRegistrationNotification("error", "Registration Error", "Please enter a username.");
        return;
    }

    if (!emailInput.value.trim()) {
        showRegistrationNotification("error", "Registration Error", "Please enter an email address.");
        return;
    }

    if (!emailInput.validity.valid || emailInput.value.trim().length > 254) {
        showRegistrationNotification("error", "Registration Error", "Please enter a valid email address.");
        return;
    }

    if (!passwordInput.value) {
        showRegistrationNotification("error", "Registration Error", "Please enter a password.");
        return;
    }

    if (passwordInput.value !== confirmPasswordInput.value) {
        showRegistrationNotification("error", "Registration Error", "Passwords do not match.");
        return;
    }

    if (!isPasswordValid(passwordInput.value)) {
        showRegistrationNotification(
            "error",
            "Registration Error",
            "Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one digit, and one special character."
        );
        return;
    }

    try {
        const response = await fetch(registrationEndpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(Object.fromEntries(new FormData(registerForm)))
        });
        const data = await response.json();

        if (data.success) {
            showRegistrationNotification(
                "success",
                "Registration Successful",
                data.message || "You have been registered successfully."
            );
        } else {
            showRegistrationNotification(
                "error",
                "Registration Error",
                data.message || "An error occurred while registering."
            );
        }
    } catch (error) {
        console.error("Unable to submit the registration.", error);
        showRegistrationNotification(
            "error",
            "Registration Error",
            "The server could not be reached or returned an invalid response."
        );
    }
});
