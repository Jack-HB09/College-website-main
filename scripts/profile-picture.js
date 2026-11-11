const profilePicturePage = document.getElementById("profile-picture-dropzone");

if (profilePicturePage) {
    const fileInput = document.getElementById("profile-picture-input");
    const sourceImage = document.getElementById("profile-picture-source");
    const stage = document.getElementById("profile-picture-stage");
    const cropCircle = document.getElementById("profile-picture-crop-circle");
    const cropper = document.getElementById("profile-picture-cropper");
    const saveButton = document.getElementById("profile-picture-save");
    const cancelButton = document.getElementById("profile-picture-cancel");
    const currentPicture = document.getElementById("profile-picture-current");
    const profilePictureEndpoint = new URL("php/profile-picture.php", document.currentScript.src);
    const defaultPicture = currentPicture.getAttribute("src");
    const maxImageBytes = 8 * 1024 * 1024;
    const maxImagePixels = 12_000_000;
    const outputSize = 512;
    let activeFile = null;
    let objectUrl = null;
    let cropCenter = { x: 0.5, y: 0.5 };
    let cropGeometry = null;

    if (
        !(fileInput instanceof HTMLInputElement)
        || !(sourceImage instanceof HTMLImageElement)
        || !(stage instanceof HTMLElement)
        || !(cropCircle instanceof HTMLElement)
        || !(cropper instanceof HTMLElement)
        || !(saveButton instanceof HTMLButtonElement)
        || !(cancelButton instanceof HTMLButtonElement)
        || !(currentPicture instanceof HTMLImageElement)
        || typeof window.MessageNotification !== "function"
    ) {
        throw new Error("The profile picture controls or notification system were not found.");
    }

    function showProfilePictureNotification(type, title, content) {
        new MessageNotification({ type, title, content }, document.getElementById("message")).show();
    }

    function refreshPicture(image) {
        image.onerror = () => {
            image.onerror = null;
            image.src = defaultPicture;
        };
        image.src = `${profilePictureEndpoint.href}?v=${Date.now()}`;
    }

    function setCropPosition(x, y) {
        if (!cropGeometry) {
            return;
        }

        const { width, height, diameter } = cropGeometry;
        const minX = diameter / 2;
        const minY = diameter / 2;
        const maxX = width - minX;
        const maxY = height - minY;
        const centerX = Math.min(maxX, Math.max(minX, x));
        const centerY = Math.min(maxY, Math.max(minY, y));
        cropCenter = {
            x: (centerX - minX) / (maxX - minX),
            y: (centerY - minY) / (maxY - minY)
        };
        cropCircle.style.width = `${diameter}px`;
        cropCircle.style.height = `${diameter}px`;
        cropCircle.style.left = `${centerX - diameter / 2}px`;
        cropCircle.style.top = `${centerY - diameter / 2}px`;
    }

    function updateCropGeometry(reset = false) {
        if (!sourceImage.naturalWidth || !sourceImage.naturalHeight) {
            return;
        }

        const imageRect = sourceImage.getBoundingClientRect();
        const width = imageRect.width;
        const height = imageRect.height;
        if (!width || !height) {
            return;
        }

        const diameter = Math.min(width, height) * 0.64;
        cropGeometry = { width, height, diameter };
        if (reset) {
            cropCenter = { x: 0.5, y: 0.5 };
        }

        const { x, y } = cropCenter;
        setCropPosition(
            diameter / 2 + x * (width - diameter),
            diameter / 2 + y * (height - diameter)
        );
    }

    function setSourceFile(file) {
        if (!(file instanceof File)) {
            return;
        }
        if (file.size < 1 || file.size > maxImageBytes) {
            showProfilePictureNotification("error", "Image too large", "Choose a JPG or PNG smaller than 8 MB.");
            return;
        }
        if (file.type && !["image/jpeg", "image/png"].includes(file.type)) {
            showProfilePictureNotification("error", "Image not supported", "Choose a JPG or PNG image.");
            return;
        }

        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
        }
        activeFile = file;
        objectUrl = URL.createObjectURL(file);
        sourceImage.onload = () => {
            const pixelCount = sourceImage.naturalWidth * sourceImage.naturalHeight;
            if (
                sourceImage.naturalWidth > 8000
                || sourceImage.naturalHeight > 8000
                || pixelCount > maxImagePixels
            ) {
                closeCropper();
                showProfilePictureNotification("error", "Image too large", "Choose an image with smaller dimensions.");
                return;
            }

            cropper.hidden = false;
            window.requestAnimationFrame(() => updateCropGeometry(true));
        };
        sourceImage.onerror = () => {
            closeCropper();
            showProfilePictureNotification("error", "Image could not be opened", "Choose a valid JPG or PNG image.");
        };
        sourceImage.src = objectUrl;
    }

    function closeCropper() {
        cropper.hidden = true;
        sourceImage.removeAttribute("src");
        activeFile = null;
        cropGeometry = null;
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
            objectUrl = null;
        }
        fileInput.value = "";
    }

    function createCroppedPicture() {
        if (!activeFile || !cropGeometry || !sourceImage.naturalWidth) {
            throw new Error("Choose an image and position the crop first.");
        }

        const imageRect = sourceImage.getBoundingClientRect();
        const sourceScaleX = sourceImage.naturalWidth / imageRect.width;
        const sourceScaleY = sourceImage.naturalHeight / imageRect.height;
        const diameter = cropGeometry.diameter;
        const sourceDiameterX = diameter * sourceScaleX;
        const sourceDiameterY = diameter * sourceScaleY;
        const cropX = cropCenter.x * (imageRect.width - diameter) * sourceScaleX;
        const cropY = cropCenter.y * (imageRect.height - diameter) * sourceScaleY;
        const canvas = document.createElement("canvas");
        canvas.width = outputSize;
        canvas.height = outputSize;
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) {
            throw new Error("Your browser could not prepare the cropped image.");
        }

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, outputSize, outputSize);
        context.drawImage(
            sourceImage,
            cropX,
            cropY,
            sourceDiameterX,
            sourceDiameterY,
            0,
            0,
            outputSize,
            outputSize
        );

        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => {
                if (!blob) {
                    reject(new Error("Your browser could not create the cropped image."));
                    return;
                }
                resolve(blob);
            }, "image/jpeg", 0.86);
        });
    }

    async function saveProfilePicture() {
        if (saveButton.disabled) {
            return;
        }

        saveButton.disabled = true;
        cancelButton.disabled = true;
        try {
            const imageBlob = await createCroppedPicture();
            if (imageBlob.size > 2 * 1024 * 1024) {
                throw new Error("The cropped picture is too large. Move the crop or choose another image.");
            }

            const data = new FormData();
            data.append("profile_picture", imageBlob, "profile-picture.jpg");
            const response = await fetch(profilePictureEndpoint, {
                method: "POST",
                headers: { "Accept": "application/json" },
                cache: "no-store",
                body: data
            });
            let result;
            try {
                result = await response.json();
            } catch (error) {
                console.error("The profile picture service returned an invalid response.", {
                    status: response.status,
                    error
                });
                throw new Error("Your picture could not be saved. Please try again later.");
            }
            if (!response.ok || !result || result.success !== true) {
                throw new Error(
                    result && typeof result.message === "string"
                        ? result.message
                        : "Your picture could not be saved. Please try again later."
                );
            }

            refreshPicture(currentPicture);
            window.dispatchEvent(new CustomEvent("profile-picture-updated"));
            closeCropper();
            showProfilePictureNotification("success", "Picture updated", result.message);
        } catch (error) {
            console.error("Unable to save the profile picture.", error);
            showProfilePictureNotification(
                "error",
                "Picture could not be saved",
                error instanceof TypeError
                    ? "The service could not be reached. Please try again."
                    : error.message
            );
        } finally {
            saveButton.disabled = false;
            cancelButton.disabled = false;
        }
    }

    profilePicturePage.addEventListener("dragover", event => {
        const files = Array.from(event.dataTransfer?.items ?? []).filter(item => item.kind === "file");
        if (files.length === 0) {
            return;
        }
        event.preventDefault();
        profilePicturePage.classList.add("is-dragging");
        event.dataTransfer.dropEffect = files.some(item => (
            !item.type || ["image/jpeg", "image/png"].includes(item.type)
        )) ? "copy" : "none";
    });

    profilePicturePage.addEventListener("dragleave", event => {
        if (!(event.relatedTarget instanceof Node) || !profilePicturePage.contains(event.relatedTarget)) {
            profilePicturePage.classList.remove("is-dragging");
        }
    });

    profilePicturePage.addEventListener("drop", event => {
        event.preventDefault();
        profilePicturePage.classList.remove("is-dragging");
        const file = event.dataTransfer?.files?.[0];
        if (file) {
            setSourceFile(file);
        }
    });

    window.addEventListener("dragover", event => {
        if (Array.from(event.dataTransfer?.items ?? []).some(item => item.kind === "file")) {
            event.preventDefault();
            if (!(event.target instanceof Node) || !profilePicturePage.contains(event.target)) {
                event.dataTransfer.dropEffect = "none";
            }
        }
    });

    window.addEventListener("drop", event => {
        if (Array.from(event.dataTransfer?.items ?? []).some(item => item.kind === "file")) {
            event.preventDefault();
        }
    });

    fileInput.addEventListener("change", () => {
        setSourceFile(fileInput.files?.[0]);
    });

    profilePicturePage.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInput.click();
        }
    });

    cropCircle.addEventListener("pointerdown", event => {
        if (!cropGeometry) {
            return;
        }
        event.preventDefault();
        cropCircle.setPointerCapture(event.pointerId);
        const stageRect = stage.getBoundingClientRect();
        const circleCenterX = cropGeometry.diameter / 2
            + cropCenter.x * (cropGeometry.width - cropGeometry.diameter);
        const circleCenterY = cropGeometry.diameter / 2
            + cropCenter.y * (cropGeometry.height - cropGeometry.diameter);
        const pointerOffsetX = event.clientX - stageRect.left - circleCenterX;
        const pointerOffsetY = event.clientY - stageRect.top - circleCenterY;
        const moveCrop = pointerEvent => {
            setCropPosition(
                pointerEvent.clientX - stageRect.left - pointerOffsetX,
                pointerEvent.clientY - stageRect.top - pointerOffsetY
            );
        };
        const stopMoving = () => {
            cropCircle.removeEventListener("pointermove", moveCrop);
            cropCircle.removeEventListener("pointerup", stopMoving);
            cropCircle.removeEventListener("pointercancel", stopMoving);
        };
        cropCircle.addEventListener("pointermove", moveCrop);
        cropCircle.addEventListener("pointerup", stopMoving, { once: true });
        cropCircle.addEventListener("pointercancel", stopMoving, { once: true });
    });

    cropCircle.addEventListener("keydown", event => {
        if (!cropGeometry) {
            return;
        }
        const step = event.shiftKey ? 0.05 : 0.01;
        const delta = {
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
            ArrowUp: [0, -step],
            ArrowDown: [0, step]
        }[event.key];
        if (!delta) {
            return;
        }
        event.preventDefault();
        const { width, height, diameter } = cropGeometry;
        const minX = diameter / 2;
        const minY = diameter / 2;
        setCropPosition(
            minX + Math.min(1, Math.max(0, cropCenter.x + delta[0])) * (width - diameter),
            minY + Math.min(1, Math.max(0, cropCenter.y + delta[1])) * (height - diameter)
        );
    });

    saveButton.addEventListener("click", saveProfilePicture);
    cancelButton.addEventListener("click", closeCropper);
    window.addEventListener("resize", () => updateCropGeometry());
    window.addEventListener("profile-picture-updated", () => refreshPicture(currentPicture));

    refreshPicture(currentPicture);
}
