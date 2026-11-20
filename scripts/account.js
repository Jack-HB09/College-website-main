const messageContainer = document.getElementById("message");
document.getElementById("account-date-of-birth").max = new Date().toISOString().split("T")[0];

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
