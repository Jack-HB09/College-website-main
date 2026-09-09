addEventListener("DOMContentLoaded", (event) => { 
const account_svg = document.getElementById("account-svg");
account_svg.addEventListener("click",()=>{
    console.log
    account_svg.classList.toggle("active")
}); 


const hamburger = document.getElementById("hamburger-svg")
const hamburger_menu = document.getElementById("hamburger-nav")
hamburger.addEventListener("click",()=>{
    hamburger_menu.classList.toggle("show")
});
});