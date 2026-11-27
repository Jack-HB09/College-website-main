const messageContainer = document.getElementById("message");

async function displayAccountInfo() {
    try {
        const response = await fetch("scripts/php/getaccount.php", {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            cache: "no-store"
        });

        const result = await response.json();
        if (!response.ok || !result.success || !result.userdata) {
            showNotification(
                "error",
                "Failed to Load Profile",
                result.message || "Could not load profile information."
            );
            return;
        }

        document.getElementById("account-firstname-display").textContent = result.userdata.firstname || "";
        document.getElementById("account-lastname-display").textContent = result.userdata.lastname || "";
        document.getElementById("account-date-of-birth-display").textContent = result.userdata.date_of_birth || "";
    } catch (error) {
        console.error("Profile update request failed:", error);
        showNotification(
            "error",
            "Network Error",
            "Could not connect to the server. Please try again."
        );
    }
}

function showNotification(type, title, content, duration = 4000) {
    new MessageNotification({
        type,
        title,
        content,
        duration
    }, messageContainer).show();
}

const accountInfo = document.getElementById("account-info");
const accountInfoStatus = document.getElementById("account-info-save-status");
const accountFields = Array.from(accountInfo.querySelectorAll("[data-field]"));
let saveTimer = null;
let isSaving = false;
let saveAgain = false;
let changeVersion = 0;

function getAccountInfoPayload() {
    return Object.fromEntries(accountFields.map(field => [
        field.dataset.field,
        field.textContent.trim()
    ]));
}

function isValidDateOfBirth(value) {
    if (value === "") {
        return true;
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
        return false;
    }

    const [, yearText, monthText, dayText] = match;
    const date = new Date(0);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCFullYear(Number(yearText), Number(monthText) - 1, Number(dayText));
    return date.getUTCFullYear() === Number(yearText)
        && date.getUTCMonth() === Number(monthText) - 1
        && date.getUTCDate() === Number(dayText);
}

function queueAccountInfoSave() {
    changeVersion += 1;
    accountInfoStatus.textContent = "Unsaved changes";
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveAccountInfo, 800);
}

async function saveAccountInfo() {
    if (isSaving) {
        saveAgain = true;
        return;
    }

    const payload = getAccountInfoPayload();
    if (!isValidDateOfBirth(payload.date_of_birth)) {
        accountInfoStatus.textContent = "Use YYYY-MM-DD for the date of birth.";
        return;
    }

    const savedVersion = changeVersion;
    isSaving = true;
    saveAgain = false;
    accountInfoStatus.textContent = "Saving...";

    try {
        const response = await fetch("scripts/php/updateaccount.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.message || "Profile update failed.");
        }

        if (changeVersion === savedVersion) {
            accountInfoStatus.textContent = "Changes saved.";
        }
    } catch (error) {
        console.error("Unable to save profile information.", error);
        accountInfoStatus.textContent = error.message || "Changes could not be saved.";
    } finally {
        isSaving = false;
        if (saveAgain || changeVersion !== savedVersion) {
            saveAgain = false;
            window.clearTimeout(saveTimer);
            saveTimer = window.setTimeout(saveAccountInfo, 250);
        }
    }
}

accountFields.forEach(field => {
    field.addEventListener("input", queueAccountInfoSave);
    field.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            field.blur();
        }
    });
});

window.addEventListener("account-session-ended", () => {
    window.clearTimeout(saveTimer);
    saveTimer = null;
});

document.addEventListener("DOMContentLoaded", displayAccountInfo);

document.getElementById("account-info-save-button").addEventListener("click", saveAccountInfo);