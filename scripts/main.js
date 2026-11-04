function add_product(count = 15) {
    const productScroller = document.getElementById("product-scroller");
    if (!productScroller) {
        throw new Error('Product container "#product-scroller" was not found.');
    }
    if (!Number.isInteger(count) || count < 0) {
        throw new RangeError("Product count must be a non-negative integer.");
    }

    const firstIndex = productScroller.querySelectorAll(".product-card").length;
    const products = document.createDocumentFragment();

    for (let index = 0; index < count; index += 1) {
        const card = document.createElement("div");
        card.className = "product-card";
        card.id = `product-card-${firstIndex + index}`;
        card.innerHTML = `
            <img src="images/placeholder.svg" alt="Product Image" class="product-image">
            <div class="product-details">
                <div class="product-name">Product Name</div>
                <div class="product-price">$19.99</div>
                <div class="product-size-container" aria-label="Choose a size">
                    <button class="product-size-container-size" type="button" value="small" aria-pressed="false">S</button>
                    <button class="product-size-container-size" type="button" value="medium" aria-pressed="false">M</button>
                    <button class="product-size-container-size" type="button" value="large" aria-pressed="false">L</button>
                </div>
                <button class="add-to basket" type="button">add to basket</button>
            </div>
        `;
        products.appendChild(card);
    }

    productScroller.appendChild(products);
    return count;
}

function showProductNotification(type, title, content) {
    new MessageNotification({
        type,
        title,
        content,
        duration: 3000
    }).show();
}

document.addEventListener("DOMContentLoaded", () => {
    const accountIcon = document.getElementById("account-svg");
    const url = new URL(window.location.href);
    if (accountIcon && url.searchParams.get("login") === "success") {
        accountIcon.classList.add("active");
        url.searchParams.delete("login");
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }

    accountIcon?.addEventListener("click", () => {
        window.location.href = "login.html";
    });

    const hamburger = document.getElementById("hamburger-svg");
    const hamburgerMenu = document.getElementById("hamburger-nav");
    if (hamburger && hamburgerMenu) {
        if (window.innerWidth > 800) {
            hamburgerMenu.classList.add("show");
        }
        hamburger.addEventListener("click", () => {
            hamburgerMenu.classList.toggle("show");
        });
    }

    const productScroller = document.getElementById("product-scroller");
    if (!productScroller) {
        return;
    }

    add_product(8);
    window.shoppingBasket = [];

    productScroller.addEventListener("click", event => {
        if (!(event.target instanceof Element)) {
            return;
        }

        const sizeButton = event.target.closest(".product-size-container-size");
        if (sizeButton) {
            const sizeButtons = sizeButton.parentElement.querySelectorAll(".product-size-container-size");
            sizeButtons.forEach(button => {
                const isSelected = button === sizeButton;
                button.setAttribute("aria-pressed", String(isSelected));
                button.classList.toggle("selected", isSelected);
            });
            return;
        }

        const addButton = event.target.closest(".add-to.basket");
        if (!addButton) {
            return;
        }

        const card = addButton.closest(".product-card");
        const selectedSize = card.querySelector('.product-size-container-size[aria-pressed="true"]');
        if (!selectedSize) {
            showProductNotification("warning", "Choose a size", "Select a size before adding this product to your basket.");
            return;
        }

        const item = {
            productId: card.id,
            name: card.querySelector(".product-name").textContent,
            size: selectedSize.value
        };
        window.shoppingBasket.push(item);
        showProductNotification("success", "Added to Basket", `${item.name} (${item.size}) was added to your basket.`);
    });
});
