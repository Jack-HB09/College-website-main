function add_product(rows = 5) {
    const product_scoller = document.getElementById("product-scroller");
    console.log(product_scoller);
    const AMOUNT = rows * 3;
    for (let i = 0; i < AMOUNT; i++) {
        product_scoller.innerHTML += `
        <div class="product-card" id="product-card-` + i + `">
            <img src="images/placeholder.svg" alt="Product Image" class="product-image">
                <div class="product-details " id="product details-id">
                    <div class="product-name">
                        Product Name
                    </div>
                    <div class="product-price">$19.99</div>
                    <div class="product-size-container">
                        <button class="product-size-container-size" value="small">S</button>
                        <button class="product-size-container-size" value="medium">M</button>
                        <button class="product-size-container-size" value="large">L</button>
                    </div>
                    <button class="add-to basket">add to basket</button>
                </div>
        </div>
        `
    }
}

addEventListener("DOMContentLoaded", (event) => {
    console.log(event)
    const account_svg = document.getElementById("account-svg");
    account_svg.addEventListener("click", () => {

        account_svg.classList.toggle("active")
    });
    add_product(5)


    const hamburger = document.getElementById("hamburger-svg")
    const hamburger_menu = document.getElementById("hamburger-nav")
    hamburger.addEventListener("click", () => {
        hamburger_menu.classList.toggle("show")
    });
});

