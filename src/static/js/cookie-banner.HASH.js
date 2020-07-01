if (!window.cookieBannerClick) {
  window.cookieBannerClick = function () {
    window.localStorage.setItem("acceptedCookies", "true");
    document.documentElement.classList.remove("show-cookie-banner");
  };
}

window.addEventListener("load", function () {
  var element = document.getElementById("accept-cookies-button");
  element.addEventListener("click", window.cookieBannerClick);

  if (window.localStorage.getItem("acceptedCookies") !== "true") {
    if (!document.documentElement.classList.contains("show-cookie-banner")) {
      document.documentElement.classList.add("show-cookie-banner");
    }
  }
});
