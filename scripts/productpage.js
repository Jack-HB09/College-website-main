const reviewBox = document.querySelector(".review-box");

if (reviewBox) {
    document.addEventListener("click", event => {
        const bounds = reviewBox.getBoundingClientRect();
        const x = event.clientX;
        const y = event.clientY;

        if (
            x >= bounds.left - 10
            && x <= bounds.right + 10
            && y >= bounds.top - 10
            && y <= bounds.bottom + 10
        ) {
            console.log("Click inside the review box", { x, y });
            document.getElementById("review-star-colour").style.width = `${Math.max(0, Math.min(1, (x - bounds.left) / bounds.width)) * 100}%`;
        } else {
            console.log("Click outside the review box", { x, y });
        }
    });
}
