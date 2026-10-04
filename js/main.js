/* ==========================================================================
   PORTFOLIO — INTERACTION
   Two small behaviours, no dependencies:
   1. Nav links to sections on the current page scroll there smoothly.
   2. Hovering or focusing a work name shows its picture in the preview panel.
   ========================================================================== */

"use strict";

(function () {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    /* ------------------------------------------------------- smooth anchors */

    document.addEventListener("click", (e) => {
        const link = e.target.closest("a[href*='#']");
        if (!link) return;

        const url = new URL(link.href, window.location.href);
        if (url.pathname !== window.location.pathname || !url.hash) return;

        const target = document.getElementById(url.hash.slice(1));
        if (!target) return;

        e.preventDefault();
        target.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth" });
        history.replaceState(null, "", url.hash);
    });

    /* ---------------------------------------------------------- work preview */

    const names = Array.from(document.querySelectorAll(".work-name"));
    const shots = Array.from(document.querySelectorAll(".work-shot"));

    names.forEach((name, i) => {
        const show = () => shots.forEach((shot, j) => shot.classList.toggle("on", i === j));
        name.addEventListener("mouseenter", show);
        name.addEventListener("focus", show);
    });
})();
