document.querySelectorAll(".password-toggle").forEach(toggle => {
    const inputId = toggle.getAttribute("aria-controls");
    const passwordInput = inputId ? document.getElementById(inputId) : null;

    if (!(passwordInput instanceof HTMLInputElement)) {
        throw new Error("A password toggle must reference an input field.");
    }

    toggle.addEventListener("click", () => {
        const isVisible = passwordInput.type === "text";
        passwordInput.type = isVisible ? "password" : "text";
        toggle.setAttribute("aria-pressed", String(!isVisible));
        toggle.setAttribute("aria-label", isVisible ? "Show password" : "Hide password");
    });
});
