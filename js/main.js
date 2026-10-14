"use strict";

(function () {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Smooth-scroll links to sections on the current page.
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

    // Turn the nav into a frosted pill once the page has scrolled.
    const nav = document.querySelector(".nav");
    if (nav) {
        const updateNav = () => nav.classList.toggle("scrolled", window.scrollY > 40);
        window.addEventListener("scroll", updateNav, { passive: true });
        updateNav();
    }

    // Hovering or focusing a work name shows its picture in the preview panel.
    const workNames = document.querySelectorAll(".work-name");
    const workShots = document.querySelectorAll(".work-shot");

    workNames.forEach((name, i) => {
        const show = () => workShots.forEach((shot, j) => shot.classList.toggle("on", i === j));
        name.addEventListener("mouseenter", show);
        name.addEventListener("focus", show);
    });

    // Fade [data-reveal] elements up as they scroll into view.
    const revealables = Array.from(document.querySelectorAll("[data-reveal]"));

    // Once revealed, drop the attribute so hover transitions run at normal speed.
    const finishReveal = (el) => {
        el.removeAttribute("data-reveal");
        el.classList.remove("in");
        el.style.removeProperty("--i");
    };

    if (!revealables.length || reduceMotion.matches || !("IntersectionObserver" in window)) {
        revealables.forEach(finishReveal);
        return;
    }

    revealables.forEach((el) => el.style.setProperty("--i", String(Math.min(staggerIndex(el), 8))));

    // Hide everything without a transition first, so elements already on
    // screen don't fade out before fading in.
    const root = document.documentElement;
    root.classList.add("reveals", "reveals-init");
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("reveals-init")));

    const reveal = (el) => {
        observer.unobserve(el);
        el.classList.add("in");
        window.setTimeout(() => finishReveal(el), 2400);
    };

    const observer = new IntersectionObserver(
        (entries) => entries.forEach((entry) => entry.isIntersecting && reveal(entry.target)),
        { rootMargin: "0px 0px -8% 0px" }
    );
    revealables.forEach((el) => observer.observe(el));

    // A fast scroll or anchor jump can skip past an element between observer
    // callbacks, so also reveal anything that has ended up above the fold.
    let sweepQueued = false;
    const revealPassed = () => {
        sweepQueued = false;
        revealables.forEach((el) => {
            const waiting = el.hasAttribute("data-reveal") && !el.classList.contains("in");
            if (waiting && el.getBoundingClientRect().top < window.innerHeight) reveal(el);
        });
    };
    window.addEventListener("scroll", () => {
        if (sweepQueued) return;
        sweepQueued = true;
        requestAnimationFrame(revealPassed);
    }, { passive: true });

    // Siblings that arrive together are staggered by their position. An element
    // alone in a list item (like each work name) uses the item's position.
    function staggerIndex(el) {
        const parent = el.parentElement;
        const siblings = Array.from(parent.children).filter((c) => c.hasAttribute("data-reveal"));

        if (siblings.length === 1 && parent.tagName === "LI") {
            return Array.from(parent.parentElement.children).indexOf(parent);
        }
        return siblings.indexOf(el);
    }
})();
