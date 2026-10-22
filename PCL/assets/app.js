/* PCL2-Reload · 交互脚本 */
(function () {
  "use strict";

  /* ---- 复制按钮 ---- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        resolve();
      } catch (e) {
        reject(e);
      }
      document.body.removeChild(ta);
    });
  }

  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var value = btn.getAttribute("data-copy");
      var original = btn.textContent;
      copyText(value)
        .then(function () {
          btn.textContent = "已复制";
          btn.classList.add("done");
        })
        .catch(function () {
          btn.textContent = "复制失败";
        })
        .finally(function () {
          setTimeout(function () {
            btn.textContent = original;
            btn.classList.remove("done");
          }, 1600);
        });
    });
  });

  /* ---- 首次进入 · 广告弹窗 ---- */
  (function () {
    var overlay = document.getElementById("adOverlay");
    if (!overlay) return;

    var KEY = "pcl2reload:ad:blockhelm:v1";
    var shown = false;
    var lastFocus = null;

    function seen() {
      try { return window.localStorage.getItem(KEY) === "1"; } catch (e) { return false; }
    }
    function markSeen() {
      try { window.localStorage.setItem(KEY, "1"); } catch (e) {}
    }

    function open() {
      if (shown) return;
      shown = true;
      lastFocus = document.activeElement;
      overlay.hidden = false;
      document.body.style.overflow = "hidden";
      requestAnimationFrame(function () { overlay.classList.add("show"); });
      var box = overlay.querySelector(".ad-modal");
      if (box) box.focus({ preventScroll: true });
    }

    function close() {
      if (!shown) return;
      shown = false;
      overlay.classList.remove("show");
      markSeen();
      document.body.style.overflow = "";
      window.setTimeout(function () { overlay.hidden = true; }, 280);
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }

    if (!seen()) window.setTimeout(open, 900);

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
    overlay.querySelectorAll("[data-ad-close]").forEach(function (btn) {
      btn.addEventListener("click", close);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && shown) close();
    });
    overlay.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      var f = overlay.querySelectorAll("a[href], button:not([disabled])");
      if (!f.length) return;
      var first = f[0];
      var last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  })();

  /* ---- 滚动淡入 ---- */
  var items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach(function (el) { el.classList.add("in"); });
    return;
  }

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
  );
  items.forEach(function (el) { io.observe(el); });

  /* ---- 目录高亮 ---- */
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll(".toc a[href^='#']"));
  if (tocLinks.length) {
    var targets = tocLinks
      .map(function (a) {
        return document.getElementById(a.getAttribute("href").slice(1));
      })
      .filter(Boolean);

    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          tocLinks.forEach(function (a) {
            var on = a.getAttribute("href") === "#" + entry.target.id;
            a.style.color = on ? "var(--accent-soft)" : "";
            a.style.fontWeight = on ? "600" : "";
          });
        });
      },
      { rootMargin: "-15% 0px -70% 0px" }
    );
    targets.forEach(function (t) { spy.observe(t); });
  }
})();
