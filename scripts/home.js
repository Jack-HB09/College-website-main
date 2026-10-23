document.getElementById("products-page").addEventListener("mousedown", () => {
    
    const timetowait = Math.round(Math.random() * 10000);
const alertBox = document.getElementById("alert");

if (alertBox) {
    alertBox.classList.add("show");
} else {
    console.log("Element not found");
}
    console.log("home")
    console.log(timetowait)

    setTimeout(() => {
        window.open("products.html?whenfrom=home", "_self");
    }, timetowait);

})