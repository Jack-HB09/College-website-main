const messageContainer = document.getElementById("message");
document.getElementById("account-date-of-birth").max = new Date().toISOString().split("T")[0];

async function displayAccountInfo() {
    let  accountData = {};
    try{
        const responce = await fetch("scripts/php/getaccount.php", {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "same-origin" // Ensures PHP session cookies are sent
        });

        const result = await responce.json();
        console.log(result);

        if (responce.ok && result.success) {
            accountData = result.userdata;
            console.log(accountData.firstname);
        }else{
            accountData = null;
            showNotification(
                "error",
                "Failed to Load Profile",
                result.message || "Could not load profile information."
            );
            return;
        }

            document.getElementById("account-firstname-display").textContent  = accountData.firstname || "";
    document.getElementById("account-lastname-display").textContent  = accountData.lastname || "";
    //document.getElementById("account-email-display").textContent  = accountData.email || "";
    document.getElementById("account-date-of-birth-display").textContent  = accountData.date_of_birth || "";

    }catch(error){
        console.error("Profile update request failed:", error);
        showNotification(
            "error",
            "Network Error",
            "Could not connect to the server. Please try again."
        );
    }



}

function getformData() {
    const formData = new FormData(document.getElementById("account-info-form"));
    const data = {};
    for (const [key, value] of formData.entries()) {
        data[key] = value;
    }
    return data;
}

function showNotification(type, title, content, duration = 4000) {
    new MessageNotification({
        type,
        title,
        content,
        duration
    }, messageContainer).show();
}

function clearAccountForm(form) {
    if (!(form instanceof HTMLFormElement)) {
        return;
    }

    form.reset();

    for (const control of form.elements) {
        if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
            if (["submit", "button", "reset"].includes(control.type)) {
                continue;
            }
            control.value = "";
        } else if (control instanceof HTMLSelectElement) {
            control.selectedIndex = -1;
        }
    }

    for (const textElement of form.querySelectorAll("p, span, output")) {
        textElement.textContent = "";
    }

    document.getElementById("account-date-of-birth").max = new Date().toISOString().split("T")[0];
}

function hideAccountForm(form, container = form) {
    clearAccountForm(form);
    if (container instanceof HTMLElement) {
        container.hidden = true;
        container.classList.remove("active");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    displayAccountInfo();
});

document.getElementById("account-info-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitBtn = event.target.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    const formData = getformData();

    try {
        const response = await fetch("scripts/php/updateaccount.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "same-origin", // Ensures PHP session cookies are sent
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        console.log(result);

        if (response.ok && result.success) {
            showNotification(
                "success",
                "Profile Updated",
                result.message || "Your profile has been updated successfully."
            );
            hideAccountForm(accountInfoForm, accountInfoContainer);
            accountEditButton.value = "Edit account information";
            await displayAccountInfo();
        } else {
            showNotification(
                "error",
                "Update Failed",
                result.message || "Failed to update profile."
            );
        }
    } catch (error) {
        console.error("Profile update request failed:", error);
        showNotification(
            "error",
            "Network Error",
            "Could not connect to the server. Please try again."
        );
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
});

const accountEditButton = document.getElementById("account-edit-button");
const accountInfoContainer = document.getElementById("account-info");
const accountInfoForm = document.getElementById("account-info-form");

accountEditButton.addEventListener("click", () => {
    if (accountInfoContainer.classList.contains("active")) {
        hideAccountForm(accountInfoForm, accountInfoContainer);
        accountEditButton.value = "Edit account information";
        return;
    }

    accountInfoContainer.classList.add("active");
    accountInfoContainer.hidden = false;
    accountEditButton.value = "Cancel editing";

    document.getElementById("account-firstname").value =
        document.getElementById("account-firstname-display").textContent;
    document.getElementById("account-lastname").value =
        document.getElementById("account-lastname-display").textContent;
    document.getElementById("account-date-of-birth").value =
        document.getElementById("account-date-of-birth-display").textContent;
});
