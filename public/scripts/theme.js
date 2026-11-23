const themeBtn = document.querySelector(".theme");
const themeIcon = themeBtn?.querySelector("i");
const siteLogos = document.querySelectorAll(".site-logo img");

let theme = localStorage.getItem("theme");
if (theme !== "light" && theme !== "dark") theme = "light";

const setTheme = (nextTheme) => {
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("theme", nextTheme);

    siteLogos.forEach((logo) => {
        logo.src =
            nextTheme === "dark"
                ? "assets/SB3Tools_wide_dark.svg"
                : "assets/SB3Tools_wide.svg";
    });

    if (themeIcon) {
        themeIcon.className =
            "fa-solid fa-" + (nextTheme === "light" ? "sun" : "moon");
    }

    if (themeBtn) {
        themeBtn.setAttribute(
            "aria-label",
            "Switch to " + (nextTheme === "light" ? "dark" : "light") + " theme"
        );
    }
};

const toggleTheme = () => {
    theme = theme === "light" ? "dark" : "light";
    setTheme(theme);
};

if (themeBtn) themeBtn.addEventListener("click", toggleTheme);

setTheme(theme);
