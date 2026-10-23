document.getElementById("products-page").addEventListener("mousedown", () => {
    
    const timetowait = Math.round(Math.random() * 60 * 1000);
    console.log("home")
    console.log(timetowait)
    setTimeout(() => {
        window.location.href='products.html?whenfrom=home'
    }, timetowait);
})