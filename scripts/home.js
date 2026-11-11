const carousel = document.getElementById("home-carousel");

if (carousel) {
    const slides = Array.from(carousel.querySelectorAll(".carousel-slide"));
    const previousButton = document.getElementById("carousel-previous");
    const nextButton = document.getElementById("carousel-next");
    const status = document.getElementById("carousel-status");

    if (!slides.length || !previousButton || !nextButton || !status) {
        throw new Error("The home page carousel controls were not found.");
    }

    let activeSlide = 0;

    const showSlide = index => {
        activeSlide = (index + slides.length) % slides.length;
        slides.forEach((slide, slideIndex) => {
            slide.hidden = slideIndex !== activeSlide;
        });
        status.textContent = `Product image ${activeSlide + 1} of ${slides.length}`;
    };

    previousButton.addEventListener("click", () => showSlide(activeSlide - 1));
    nextButton.addEventListener("click", () => showSlide(activeSlide + 1));
}
