(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Mobile nav */
  var toggle = document.querySelector(".nav-toggle");
  var mobile = document.getElementById("nav-mobile");
  if (toggle && mobile) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", !open);
      if (open) {
        mobile.setAttribute("hidden", "");
      } else {
        mobile.removeAttribute("hidden");
      }
    });
    mobile.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        toggle.setAttribute("aria-expanded", "false");
        mobile.setAttribute("hidden", "");
      });
    });
  }

  /* Scroll reveal */
  if (!prefersReducedMotion) {
    var revealEls = document.querySelectorAll("[data-reveal]");
    if (revealEls.length && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              io.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
      );
      revealEls.forEach(function (el) {
        io.observe(el);
      });
    } else {
      revealEls.forEach(function (el) {
        el.classList.add("is-visible");
      });
    }
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* Particle burst */
  var layer;
  function ensureLayer() {
    if (!layer) {
      layer = document.createElement("div");
      layer.className = "particle-layer";
      layer.setAttribute("aria-hidden", "true");
      document.body.appendChild(layer);
    }
    return layer;
  }

  function burstAt(clientX, clientY, count) {
    if (prefersReducedMotion) return;
    var L = ensureLayer();
    var n = count || 14;
    for (var i = 0; i < n; i++) {
      var p = document.createElement("span");
      p.className = "particle " + (i % 2 === 0 ? "particle--blue" : "particle--orange");
      var angle = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      var dist = 60 + Math.random() * 100;
      var tx = Math.cos(angle) * dist;
      var ty = Math.sin(angle) * dist;
      p.style.left = clientX + "px";
      p.style.top = clientY + "px";
      p.style.opacity = "1";
      p.style.transform = "translate(0,0) scale(1) rotate(0deg)";
      L.appendChild(p);
      requestAnimationFrame(function () {
        p.style.transition = "transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.55s ease";
        p.style.transform =
          "translate(" + tx + "px," + ty + "px) scale(0.3) rotate(" + (Math.random() * 180 - 90) + "deg)";
        p.style.opacity = "0";
      });
      (function (node) {
        setTimeout(function () {
          if (node.parentNode) node.parentNode.removeChild(node);
        }, 600);
      })(p);
    }
  }

  function pointerFromTarget(el, e) {
    var r = el.getBoundingClientRect();
    return {
      x: e.clientX !== undefined ? e.clientX : r.left + r.width / 2,
      y: e.clientY !== undefined ? e.clientY : r.top + r.height / 2,
    };
  }

  document.querySelectorAll(".btn--particles").forEach(function (btn) {
    btn.addEventListener(
      "mouseenter",
      function (e) {
        var pt = pointerFromTarget(btn, e);
        burstAt(pt.x, pt.y, 10);
      },
      { passive: true }
    );
  });

  document.querySelectorAll(".card-particles").forEach(function (card) {
    card.addEventListener(
      "mouseenter",
      function (e) {
        var pt = pointerFromTarget(card, e);
        burstAt(pt.x, pt.y, 12);
      },
      { passive: true }
    );
  });

  /* Contact form — posts to FormSubmit; particles on click before navigation */
  var form = document.getElementById("contact-form");
  var submitBtn = form && form.querySelector(".btn--submit");
  if (submitBtn && !prefersReducedMotion) {
    submitBtn.addEventListener("click", function () {
      var r = submitBtn.getBoundingClientRect();
      burstAt(r.left + r.width / 2, r.top + r.height / 2, 16);
    });
  }
})();
