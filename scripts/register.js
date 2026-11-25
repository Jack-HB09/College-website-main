const registerForm = document.getElementById("register-form");
const usernameInput = document.getElementById("username");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirm-password");
const messageContainer = document.getElementById("login-messages");
const registrationEndpoint = new URL("php/register.php", document.currentScript.src);
const loginEndpoint = new URL("php/login.php", document.currentScript.src);
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
            await showRegistrationNotification(
                "success",
                "Registration Successful",
                data.message || "You have been registered successfully.", 700
            );
            const loginResponse = await fetch(loginEndpoint, {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        username: usernameInput.value.trim(),
        password: passwordInput.value
    })
});

const loginData = await loginResponse.json();

if (loginResponse.ok && loginData.success) {
    const redirectDelay = 700;

    showRegistrationNotification(
        "success",
        "Registration Successful",
        "Account created and logged in successfully."
    );

    window.setTimeout(() => {
        window.location.assign("products.html");
    }, redirectDelay);
} else {
    showRegistrationNotification(
        "success",
        "Registration Successful",
        "Your account was created, but automatic login failed. Please log in manually."
    );
}
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
