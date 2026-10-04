/* ==========================================================================
   PORTFOLIO — INTERACTION
   Small behaviours, no dependencies:
   1. Nav links to sections on the current page scroll there smoothly.
   2. Hovering or focusing a work name shows its picture in the preview panel.
   3. Elements marked [data-reveal] fade up as they scroll into view.
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

    /* ---------------------------------------------------------- scroll reveals */

    const pending = Array.from(document.querySelectorAll("[data-reveal]"));

    // Arrival is final: drop the attribute so the element's own hover
    // transitions take over again at their normal speed.
    const settle = (el) => {
        el.removeAttribute("data-reveal");
        el.classList.remove("in");
        el.style.removeProperty("--i");
    };

    if (pending.length && !reduceMotion.matches && "IntersectionObserver" in window) {
        // Stagger siblings that arrive together: each element's position
        // among its revealable siblings sets its delay.
        // A lone element inside a list item (each work name) staggers by
        // the item's position instead.
        pending.forEach((el) => {
            const parent = el.parentElement;
            const siblings = Array.from(parent.children).filter((c) => c.hasAttribute("data-reveal"));
            let i = siblings.indexOf(el);
            if (siblings.length === 1 && parent.tagName === "LI") i = Array.from(parent.parentElement.children).indexOf(parent);
            el.style.setProperty("--i", String(Math.min(i, 8)));
        });

        // Hide without animating, then let transitions run from the next
        // frame, so anything on screen doesn't fade out before fading in.
        const root = document.documentElement;
        root.classList.add("reveals", "reveals-init");
        requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("reveals-init")));

        const show = (el) => {
            observer.unobserve(el);
            el.classList.add("in");
            window.setTimeout(() => settle(el), 2400);
        };

        const observer = new IntersectionObserver(
            (entries) => entries.forEach((entry) => entry.isIntersecting && show(entry.target)),
            { rootMargin: "0px 0px -8% 0px" }
        );
        pending.forEach((el) => observer.observe(el));

        // A fast scroll or an anchor jump can carry an element past the
        // viewport between observer samples; reveal anything already above
        // the fold so nothing is left hidden.
        let queued = false;
        const sweep = () => {
            queued = false;
            pending.forEach((el) => {
                if (el.hasAttribute("data-reveal") && !el.classList.contains("in") &&
                    el.getBoundingClientRect().top < window.innerHeight) show(el);
            });
        };
        window.addEventListener("scroll", () => {
            if (!queued) { queued = true; requestAnimationFrame(sweep); }
        }, { passive: true });
    } else {
        pending.forEach(settle);
    }
})();
