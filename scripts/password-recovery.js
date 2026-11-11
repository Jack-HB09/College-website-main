const recoveryScriptUrl = document.currentScript?.src;
if (!recoveryScriptUrl) {
    throw new Error("The password recovery script URL could not be determined.");
}

const recoveryEndpoints = {
    questions: new URL("security-questions.json", recoveryScriptUrl),
    setQuestion: new URL("php/security-question.php", recoveryScriptUrl),
    getQuestion: new URL("php/password-reset-question.php", recoveryScriptUrl),
    resetPassword: new URL("php/password-reset.php", recoveryScriptUrl)
};

function showRecoveryNotification(type, title, content, duration = 4000) {
    if (typeof window.MessageNotification !== "function") {
        throw new Error("The notification system is not available.");
    }

    const container = document.getElementById("login-messages") ?? document.getElementById("message");
    new MessageNotification({ type, title, content, duration }, container).show();
}

async function postRecoveryJson(endpoint, data) {
    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        cache: "no-store",
        body: JSON.stringify(data)
    });

    let result;
    try {
        result = await response.json();
    } catch (error) {
        console.error("The password recovery service returned an invalid response.", {
            status: response.status,
            error
        });
        throw new Error("The request could not be completed. Please try again later.");
    }

    if (!result || typeof result !== "object" || Array.isArray(result)) {
        throw new Error("The request could not be completed. Please try again later.");
    }
    if (!response.ok || result.success !== true) {
        const message = typeof result.message === "string"
            ? result.message
            : "The request could not be completed. Please try again later.";
        const error = new Error(message);
        error.status = response.status;
        throw error;
    }

    return result;
}

async function loadRecoveryQuestion(email) {
    const result = await postRecoveryJson(recoveryEndpoints.getQuestion, { email });
    if (!Number.isInteger(result.question_id) || typeof result.question !== "string") {
        throw new TypeError("The password recovery service returned an invalid question.");
    }
    return result;
}

function findSubmitButton(form) {
    const button = form.querySelector('button[type="submit"]');
    if (!(button instanceof HTMLButtonElement)) {
        throw new Error("A password recovery form button was not found.");
    }
    return button;
}

function validateRecoveryForm(form) {
    const invalidControl = Array.from(form.elements).find(control => (
        (control instanceof HTMLInputElement || control instanceof HTMLSelectElement)
        && !control.checkValidity()
    ));
    if (invalidControl) {
        const message = invalidControl.validity.valueMissing
            ? "Complete all required fields."
            : invalidControl.validity.typeMismatch
                ? "Enter a valid email address."
                : "Check the information you entered.";
        showRecoveryNotification("error", "Check your details", message);
        invalidControl.focus();
        return false;
    }

    const answerInput = form.querySelector('input[name="answer"]');
    if (answerInput instanceof HTMLInputElement && !answerInput.value.trim()) {
        showRecoveryNotification("error", "Check your details", "Enter your recovery answer.");
        answerInput.focus();
        return false;
    }

    const passwordInput = form.querySelector('input[name="password"]');
    const confirmInput = form.querySelector('input[name="confirm_password"]');
    if (passwordInput instanceof HTMLInputElement && confirmInput instanceof HTMLInputElement) {
        if (passwordInput.value.length < 8
            || !/[A-Z]/.test(passwordInput.value)
            || !/[a-z]/.test(passwordInput.value)
            || !/\d/.test(passwordInput.value)
            || !/[!@#$%^&*(),.?":{}|<>]/.test(passwordInput.value)) {
            showRecoveryNotification(
                "error",
                "Choose a stronger password",
                "Use at least 8 characters, including an uppercase letter, a lowercase letter, a number, and a special character."
            );
            passwordInput.focus();
            return false;
        }
        if (passwordInput.value !== confirmInput.value) {
            showRecoveryNotification("error", "Passwords do not match", "Enter the same password in both fields.");
            confirmInput.focus();
            return false;
        }
    }

    return true;
}

function handleRecoveryError(title, error) {
    console.error(title, error);
    const userMessage = Number.isInteger(error?.status) && typeof error.message === "string"
        ? error.message
        : "Something went wrong. Please try again later.";
    showRecoveryNotification("error", title, userMessage);
}

async function loadQuestionOptions(select) {
    const response = await fetch(recoveryEndpoints.questions, { cache: "no-store" });
    if (!response.ok) {
        throw new Error("The recovery question list could not be loaded. Please try again later.");
    }

    const questions = await response.json();
    if (!questions || typeof questions !== "object" || Array.isArray(questions)) {
        throw new TypeError("The recovery question list is invalid.");
    }

    for (const [id, question] of Object.entries(questions)) {
        if (!/^[1-9]\d*$/.test(id) || typeof question !== "string" || !question.trim()) {
            throw new TypeError("The recovery question list contains an invalid entry.");
        }

        const option = document.createElement("option");
        option.value = id;
        option.textContent = question;
        select.append(option);
    }
}

function initializeQuestionSetup() {
    const form = document.getElementById("security-question-form");
    const select = document.getElementById("security-question");
    if (!(form instanceof HTMLFormElement) || !(select instanceof HTMLSelectElement)) {
        return;
    }

    loadQuestionOptions(select).catch(error => {
        handleRecoveryError("Recovery question unavailable", error);
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (!validateRecoveryForm(form)) {
            return;
        }
        const button = findSubmitButton(form);
        button.disabled = true;
        try {
            const formData = new FormData(form);
            await postRecoveryJson(recoveryEndpoints.setQuestion, {
                question_id: Number(formData.get("question_id")),
                answer: formData.get("answer")
            });
            form.reset();
            showRecoveryNotification("success", "Recovery question saved", "Your recovery question has been saved.");
        } catch (error) {
            handleRecoveryError("Could not save recovery question", error);
        } finally {
            button.disabled = false;
        }
    });
}

function initializePasswordReset(form, question, questionContainerId, questionIdInput, email = "") {
    const questionContainer = document.getElementById(questionContainerId);
    const idInput = document.getElementById(questionIdInput);
    if (!form || !(questionContainer instanceof HTMLElement) || !(idInput instanceof HTMLInputElement)) {
        throw new Error("The password reset form is missing a required field.");
    }

    questionContainer.textContent = question.prompt;
    idInput.value = String(question.id);
    if (email) {
        const emailInput = document.getElementById("reset-email-value");
        if (!(emailInput instanceof HTMLInputElement)) {
            throw new Error("The password reset email field was not found.");
        }
        emailInput.value = email;
    }
    form.hidden = false;
}

function initializeAccountPasswordReset() {
    const toggleButton = document.getElementById("account-reset-password-button");
    const form = document.getElementById("account-reset-password-form");
    if (!(toggleButton instanceof HTMLButtonElement) || !(form instanceof HTMLFormElement)) {
        return;
    }

    toggleButton.addEventListener("click", async () => {
        if (!form.hidden) {
            form.hidden = true;
            return;
        }

        toggleButton.disabled = true;
        try {
            const question = await loadRecoveryQuestion("");
            initializePasswordReset(form, {
                id: question.question_id,
                prompt: question.question
            }, "account-recovery-question", "account-reset-question-id");
        } catch (error) {
            handleRecoveryError("Could not load recovery question", error);
        } finally {
            toggleButton.disabled = false;
        }
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (!validateRecoveryForm(form)) {
            return;
        }
        const button = findSubmitButton(form);
        button.disabled = true;
        try {
            const data = Object.fromEntries(new FormData(form));
            const result = await postRecoveryJson(recoveryEndpoints.resetPassword, data);
            showRecoveryNotification("success", "Password changed", result.message, 1800);
            window.setTimeout(() => window.location.assign("login.html"), 1800);
        } catch (error) {
            handleRecoveryError("Could not change password", error);
        } finally {
            button.disabled = false;
        }
    });
}

function initializeLoginPasswordReset() {
    const toggleButton = document.getElementById("show-password-recovery");
    const panel = document.getElementById("password-recovery");
    const emailForm = document.getElementById("reset-email-form");
    const resetForm = document.getElementById("reset-password-form");
    if (
        !(toggleButton instanceof HTMLButtonElement)
        || !(panel instanceof HTMLElement)
        || !(emailForm instanceof HTMLFormElement)
        || !(resetForm instanceof HTMLFormElement)
    ) {
        return;
    }

    toggleButton.addEventListener("click", () => {
        panel.hidden = !panel.hidden;
        toggleButton.setAttribute("aria-expanded", String(!panel.hidden));
    });

    emailForm.addEventListener("submit", async event => {
        event.preventDefault();
        if (!validateRecoveryForm(emailForm)) {
            return;
        }
        const button = findSubmitButton(emailForm);
        button.disabled = true;
        try {
            const emailInput = document.getElementById("reset-email");
            if (!(emailInput instanceof HTMLInputElement)) {
                throw new Error("The recovery email field was not found.");
            }
            const email = emailInput.value.trim();
            const question = await loadRecoveryQuestion(email);
            initializePasswordReset(resetForm, {
                id: question.question_id,
                prompt: question.question
            }, "reset-recovery-question", "reset-question-id", email);
            emailForm.hidden = true;
        } catch (error) {
            handleRecoveryError("Could not load recovery question", error);
        } finally {
            button.disabled = false;
        }
    });

    resetForm.addEventListener("submit", async event => {
        event.preventDefault();
        if (!validateRecoveryForm(resetForm)) {
            return;
        }
        const button = findSubmitButton(resetForm);
        button.disabled = true;
        try {
            const data = Object.fromEntries(new FormData(resetForm));
            const result = await postRecoveryJson(recoveryEndpoints.resetPassword, data);
            resetForm.reset();
            showRecoveryNotification("success", "Password changed", result.message);
            window.setTimeout(() => window.location.assign("login.html"), 1800);
        } catch (error) {
            handleRecoveryError("Could not change password", error);
        } finally {
            button.disabled = false;
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initializeQuestionSetup();
    initializeAccountPasswordReset();
    initializeLoginPasswordReset();
});
