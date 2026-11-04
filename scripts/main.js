const BASKET_STORAGE_KEY = "shoppingBasket";
const PRODUCT_PRICE = 19.99;

function readBasket() {
    try {
        const storedBasket = localStorage.getItem(BASKET_STORAGE_KEY);
        if (storedBasket === null) {
            return [];
        }

        const basket = JSON.parse(storedBasket);
        if (!Array.isArray(basket)) {
            throw new TypeError("Stored basket data must be an array.");
        }

        return basket.filter(item => (
            item
            && typeof item.productId === "string"
            && typeof item.name === "string"
            && typeof item.size === "string"
            && Number.isFinite(item.price)
        ));
    } catch (error) {
        console.error("Unable to read the saved basket.", error);
        return [];
    }
}

function saveBasket(basket) {
    try {
        localStorage.setItem(BASKET_STORAGE_KEY, JSON.stringify(basket));
        window.shoppingBasket = basket;
        updateBasketCount(basket);
        return true;
    } catch (error) {
        console.error("Unable to save the basket.", error);
        return false;
    }
}

function updateBasketCount(basket) {
    const basketCount = document.getElementById("basket-count");
    if (basketCount) {
        basketCount.textContent = String(basket.length);
        const basketLink = document.getElementById("basket-link");
        basketLink?.setAttribute(
            "aria-label",
            `Basket, ${basket.length} ${basket.length === 1 ? "item" : "items"}`
        );
    }
}

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
                <div class="product-price">$${PRODUCT_PRICE.toFixed(2)}</div>
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
    if (typeof window.MessageNotification !== "function") {
        console.error("The notification class is not available.");
        return;
    }

    new MessageNotification({
        type,
        title,
        content,
        duration: 3000
    }).show();
}

function renderBasket(basket) {
    const basketItems = document.getElementById("basket-items");
    const basketEmpty = document.getElementById("basket-empty");
    const basketTotal = document.getElementById("basket-total");
    if (!basketItems || !basketEmpty || !basketTotal) {
        return;
    }

    basketItems.replaceChildren();
    basketEmpty.hidden = basket.length !== 0;
    basketTotal.textContent = `$${basket.reduce((total, item) => total + item.price, 0).toFixed(2)}`;

    basket.forEach((item, index) => {
        const row = document.createElement("article");
        row.className = "basket-item";

        const details = document.createElement("div");
        details.className = "basket-item-details";

        const name = document.createElement("h2");
        name.textContent = item.name;
        const description = document.createElement("p");
        description.textContent = `Size: ${item.size}`;
        details.append(name, description);

        const price = document.createElement("p");
        price.className = "basket-item-price";
        price.textContent = `$${item.price.toFixed(2)}`;

        const removeButton = document.createElement("button");
        removeButton.className = "basket-remove";
        removeButton.type = "button";
        removeButton.dataset.basketIndex = String(index);
        removeButton.textContent = "Remove";

        row.append(details, price, removeButton);
        basketItems.appendChild(row);
    });
}

function setAccountState(authenticated, username = "") {
    const loginLink = document.getElementById("account-login");
    const accountUser = document.getElementById("account-user");
    const logoutButton = document.getElementById("account-logout");
    if (!loginLink || !accountUser || !logoutButton) {
        return;
    }

    loginLink.hidden = authenticated;
    accountUser.hidden = !authenticated;
    logoutButton.hidden = !authenticated;
    accountUser.textContent = authenticated ? `Signed in as ${username}` : "";
}

async function loadAccountState() {
    const response = await fetch("scripts/php/session.php", {
        headers: { "Accept": "application/json" },
        cache: "no-store"
    });
    if (!response.ok) {
        throw new Error(`Account status request failed: ${response.status}`);
    }

    const result = await response.json();
    if (!result || typeof result.authenticated !== "boolean") {
        throw new TypeError("The account status response was invalid.");
    }

    setAccountState(result.authenticated, typeof result.username === "string" ? result.username : "");
}

document.addEventListener("DOMContentLoaded", () => {
    const basket = readBasket();
    window.shoppingBasket = basket;
    updateBasketCount(basket);
    renderBasket(basket);

    const accountButton = document.getElementById("account-button");
    const accountMenu = document.getElementById("account-menu");
    if (accountButton && accountMenu) {
        const setAccountMenuOpen = open => {
            accountButton.setAttribute("aria-expanded", String(open));
            accountMenu.hidden = !open;
        };

        accountButton.addEventListener("click", () => {
            setAccountMenuOpen(accountButton.getAttribute("aria-expanded") !== "true");
        });

        document.addEventListener("click", event => {
            if (event.target instanceof Node && !accountButton.parentElement.contains(event.target)) {
                setAccountMenuOpen(false);
            }
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && accountButton.getAttribute("aria-expanded") === "true") {
                setAccountMenuOpen(false);
                accountButton.focus();
            }
        });

        loadAccountState().catch(error => {
            console.error("Unable to load account status.", error);
            setAccountState(false);
        });

        const logoutButton = document.getElementById("account-logout");
        logoutButton?.addEventListener("click", async () => {
            logoutButton.disabled = true;
            try {
                const response = await fetch("scripts/php/logout.php", {
                    method: "POST",
                    headers: { "Accept": "application/json" },
                    cache: "no-store"
                });
                const result = await response.json();
                if (!response.ok || result.success !== true) {
                    throw new Error(typeof result.message === "string"
                        ? result.message
                        : `Sign-out request failed: ${response.status}`);
                }

                setAccountState(false);
                setAccountMenuOpen(false);
                showProductNotification("success", "Signed out", "You have signed out of your account.");
            } catch (error) {
                console.error("Unable to sign out.", error);
                showProductNotification("error", "Sign out failed", "Please try again.");
            } finally {
                logoutButton.disabled = false;
            }
        });
    }

    const hamburger = document.getElementById("hamburger-button");
    const primaryNavigation = document.getElementById("hamburger-nav");
    if (hamburger && primaryNavigation) {
        const setNavigationOpen = open => {
            hamburger.setAttribute("aria-expanded", String(open));
            hamburger.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
            primaryNavigation.classList.toggle("show", open);
        };

        hamburger.addEventListener("click", () => {
            setNavigationOpen(hamburger.getAttribute("aria-expanded") !== "true");
        });

        document.addEventListener("click", event => {
            if (event.target instanceof Node
                && !hamburger.contains(event.target)
                && !primaryNavigation.contains(event.target)) {
                setNavigationOpen(false);
            }
        });

        primaryNavigation.addEventListener("click", event => {
            if (event.target instanceof Element && event.target.closest("a")) {
                setNavigationOpen(false);
            }
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && hamburger.getAttribute("aria-expanded") === "true") {
                setNavigationOpen(false);
                hamburger.focus();
            }
        });
    }

    const productScroller = document.getElementById("product-scroller");
    if (productScroller) {
        add_product(8);

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
                size: selectedSize.value,
                price: PRODUCT_PRICE
            };
            const updatedBasket = [...window.shoppingBasket, item];
            if (saveBasket(updatedBasket)) {
                showProductNotification("success", "Added to Basket", `${item.name} (${item.size}) was added to your basket.`);
            } else {
                showProductNotification("error", "Basket unavailable", "Your item could not be saved. Check your browser storage settings.");
            }
        });
    }

    const basketItems = document.getElementById("basket-items");
    if (basketItems) {
        basketItems.addEventListener("click", event => {
            if (!(event.target instanceof Element)) {
                return;
            }

            const removeButton = event.target.closest("[data-basket-index]");
            if (!removeButton) {
                return;
            }

            const index = Number(removeButton.dataset.basketIndex);
            const updatedBasket = [...window.shoppingBasket];
            if (!Number.isInteger(index) || index < 0 || index >= updatedBasket.length) {
                throw new RangeError("The selected basket item no longer exists.");
            }

            updatedBasket.splice(index, 1);
            if (saveBasket(updatedBasket)) {
                renderBasket(updatedBasket);
            } else {
                showProductNotification("error", "Basket unavailable", "The item could not be removed. Check your browser storage settings.");
            }
        });
    }
});
