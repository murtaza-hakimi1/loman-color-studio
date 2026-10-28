"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const U = window.ChromaUtils;
  if (!U) {
    document.body.textContent =
      "Loman Studio could not load its color utilities.";
    return;
  }

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const state = {
    color: "#7868E6",
    palette: [],
    favorites: loadFavorites(),
  };

  const visionNames = {
    normal: "Normal color vision",
    protanopia: "Approximate protanopia simulation",
    deuteranopia: "Approximate deuteranopia simulation",
    tritanopia: "Approximate tritanopia simulation",
    achromatopsia: "Approximate grayscale simulation",
  };

  function loadFavorites() {
    try {
      const saved = JSON.parse(
        localStorage.getItem("loman-studio-favorites") || "[]",
      );
      return Array.isArray(saved)
        ? [
            ...new Set(
              saved
                .filter((value) => {
                  try {
                    U.normalizeHex(value);
                    return true;
                  } catch {
                    return false;
                  }
                })
                .map(U.normalizeHex),
            ),
          ].slice(0, 40)
        : [];
    } catch {
      return [];
    }
  }

  function saveFavorites() {
    try {
      localStorage.setItem(
        "loman-studio-favorites",
        JSON.stringify(state.favorites),
      );
    } catch {
      toast("Could not save favorites in this browser.");
    }
  }

  function toast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.add("show");
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => el.classList.remove("show"), 2400);
  }

  async function copyText(value, message = "Copied to clipboard.") {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const helper = document.createElement("textarea");
        helper.value = value;
        helper.setAttribute("readonly", "");
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.appendChild(helper);
        helper.select();
        const success = document.execCommand("copy");
        helper.remove();
        if (!success) throw new Error("Copy failed");
      }
      toast(message);
    } catch {
      toast("Copy failed. Select and copy the text manually.");
    }
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function setColor(input, options = {}) {
    try {
      const hex = U.normalizeHex(input);
      state.color = hex;
      const rgb = U.hexToRgb(hex);
      const hsl = U.rgbToHsl(rgb.r, rgb.g, rgb.b);

      $("#native-picker").value = hex;
      $("#hex-input").value = hex.slice(1);
      $("#preview-hex").textContent = hex;
      $("#color-preview").style.background = hex;

      $("#rgb-r").value = rgb.r;
      $("#rgb-g").value = rgb.g;
      $("#rgb-b").value = rgb.b;
      $("#hsl-h").value = hsl.h;
      $("#hsl-s").value = hsl.s;
      $("#hsl-l").value = hsl.l;

      $("#gradient-start").value = hex;
      $("#gradient-start-label").textContent = hex;

      renderPalette();
      renderWheel();
      renderGradient();
      renderContrast();
      renderVision();
      if (options.message) toast(options.message);
      return true;
    } catch (error) {
      toast(error.message || "Invalid color value.");
      return false;
    }
  }

  function getPalette() {
    return state.palette.length ? state.palette : [state.color];
  }

  function renderPalette() {
    const mode = $("#harmony-select").value;
    state.palette = U.makePalette(state.color, mode);
    const container = $("#palette-swatches");
    container.replaceChildren();

    state.palette.forEach((hex, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "palette-swatch";
      button.title = `Select ${hex}`;
      button.setAttribute("aria-label", `Select palette color ${hex}`);

      const swatch = document.createElement("span");
      swatch.className = "swatch-color";
      swatch.style.backgroundColor = hex;

      const code = document.createElement("span");
      code.className = "swatch-hex";
      code.textContent = hex;

      const label = document.createElement("span");
      label.className = "swatch-name";
      label.textContent = index === 0 ? "Primary" : `Color ${index + 1}`;

      button.append(swatch, code, label);
      button.addEventListener("click", () => setColor(hex));
      container.appendChild(button);
    });

    $("#palette-count").textContent = `${state.palette.length} COLORS`;
  }

  function renderWheel() {
    const wheel = $("#color-wheel");
    wheel
      .querySelectorAll(".wheel-marker")
      .forEach((marker) => marker.remove());

    const colors = getPalette();
    const rgb = U.hexToRgb(state.color);
    const hsl = U.rgbToHsl(rgb.r, rgb.g, rgb.b);
    const currentHue = hsl.h;

    colors.forEach((hex, index) => {
      const colorRgb = U.hexToRgb(hex);
      const hue = U.rgbToHsl(colorRgb.r, colorRgb.g, colorRgb.b).h;
      const angle = ((hue - 90) * Math.PI) / 180;
      const radius = 46;
      const marker = document.createElement("span");
      marker.className = "wheel-marker";
      marker.style.left = `${50 + Math.cos(angle) * radius}%`;
      marker.style.top = `${50 + Math.sin(angle) * radius}%`;
      marker.style.backgroundColor = hex;
      marker.title = `${hex}${hue === currentHue ? " (current hue)" : ""}`;
      marker.setAttribute("aria-hidden", "true");
      wheel.appendChild(marker);
    });

    wheel.setAttribute(
      "aria-label",
      `Color wheel with current hue ${currentHue} degrees`,
    );
  }

  function renderGradient() {
    const start = U.normalizeHex($("#gradient-start").value);
    const end = U.normalizeHex($("#gradient-end").value);
    const angle = Math.max(
      0,
      Math.min(360, Number($("#gradient-angle").value) || 0),
    );
    const css = `linear-gradient(${angle}deg, ${start}, ${end})`;

    $("#gradient-start-label").textContent = start;
    $("#gradient-end-label").textContent = end;
    $("#gradient-preview").style.background = css;
    $("#gradient-css").textContent = `background: ${css};`;
  }

  function renderContrast() {
    const foreground = $("#contrast-text").value.toUpperCase();
    const background = $("#contrast-bg").value.toUpperCase();
    const ratio = U.contrastRatio(foreground, background);
    const displayRatio = `${ratio.toFixed(2)}:1`;

    $("#contrast-text-label").textContent = foreground;
    $("#contrast-bg-label").textContent = background;
    $("#contrast-preview").style.color = foreground;
    $("#contrast-preview").style.backgroundColor = background;
    $("#contrast-ratio").textContent = displayRatio;

    const results = [
      ["AA normal", ratio >= 4.5],
      ["AA large", ratio >= 3],
      ["AAA normal", ratio >= 7],
      ["AAA large", ratio >= 4.5],
    ];

    const container = $("#wcag-results");
    container.replaceChildren();

    results.forEach(([label, passed]) => {
      const badge = document.createElement("span");
      badge.className = `wcag-badge ${passed ? "pass" : "fail"}`;
      badge.textContent = `${passed ? "✓" : "✕"} ${label}`;
      badge.title = passed
        ? "Passes this contrast criterion"
        : "Does not pass this contrast criterion";
      container.appendChild(badge);
    });
  }

  function renderVision() {
    const mode = $("#vision-mode").value;
    const simulated = U.simulateVision(state.color, mode);
    $("#vision-swatch").style.backgroundColor = simulated;
    $("#vision-hex").textContent = simulated;
    $("#vision-description").textContent =
      visionNames[mode] || visionNames.normal;
  }

  function renderFavorites() {
    const container = $("#favorites-list");
    container.replaceChildren();

    if (!state.favorites.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent =
        "No saved colors yet. Choose a color and select “Save color”.";
      container.appendChild(empty);
      return;
    }

    state.favorites.forEach((hex) => {
      const item = document.createElement("div");
      item.className = "favorite-item";

      const swatch = document.createElement("button");
      swatch.className = "favorite-color";
      swatch.type = "button";
      swatch.style.backgroundColor = hex;
      swatch.setAttribute("aria-label", `Select favorite ${hex}`);
      swatch.addEventListener("click", () => setColor(hex));

      const code = document.createElement("span");
      code.className = "favorite-code";
      code.textContent = hex;

      const remove = document.createElement("button");
      remove.className = "favorite-remove";
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Remove favorite ${hex}`);
      remove.addEventListener("click", () => {
        state.favorites = state.favorites.filter((color) => color !== hex);
        saveFavorites();
        renderFavorites();
        toast(`${hex} removed from favorites.`);
      });

      item.append(swatch, code, remove);
      container.appendChild(item);
    });
  }

  function saveCurrentColor() {
    if (state.favorites.includes(state.color)) {
      toast("This color is already saved.");
      return;
    }
    if (state.favorites.length >= 40) {
      toast("Your favorites are full. Remove a color first.");
      return;
    }

    state.favorites.unshift(state.color);
    saveFavorites();
    renderFavorites();
    toast(`${state.color} saved to favorites.`);
  }

  function currentRgbColors() {
    return getPalette();
  }

  function exportPalette(format) {
    const colors = currentRgbColors();
    const exports = {
      css: {
        filename: "loman-palette.css",
        mime: "text/css;charset=utf-8",
        content: U.toCss(colors),
      },
      scss: {
        filename: "loman-palette.scss",
        mime: "text/x-scss;charset=utf-8",
        content: U.toScss(colors),
      },
      svg: {
        filename: "loman-palette.svg",
        mime: "image/svg+xml;charset=utf-8",
        content: U.toSvg(colors),
      },
      json: {
        filename: "loman-palette.json",
        mime: "application/json;charset=utf-8",
        content: U.toJson(colors),
      },
      gpl: {
        filename: "loman-palette.gpl",
        mime: "text/plain;charset=utf-8",
        content: U.toGpl(colors),
      },
    };

    const item = exports[format];
    if (!item) return;
    downloadFile(item.filename, item.content, item.mime);
    toast(`${item.filename} exported.`);
  }

  $("#native-picker").addEventListener("input", (event) =>
    setColor(event.target.value),
  );

  $("#apply-hex").addEventListener("click", () => {
    const value = $("#hex-input").value.trim();
    setColor(value);
  });

  $("#hex-input").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      setColor($("#hex-input").value);
    }
  });

  $("#hex-input").addEventListener("blur", () => {
    try {
      $("#hex-input").value = U.normalizeHex($("#hex-input").value).slice(1);
    } catch {
      // Keep the invalid input visible so the user can correct it.
    }
  });

  function applyRgbInputs() {
    setColor(
      U.rgbToHex($("#rgb-r").value, $("#rgb-g").value, $("#rgb-b").value),
    );
  }

  function applyHslInputs() {
    setColor(
      U.rgbToHex(
        ...Object.values(
          U.hslToRgb($("#hsl-h").value, $("#hsl-s").value, $("#hsl-l").value),
        ),
      ),
    );
  }

  ["rgb-r", "rgb-g", "rgb-b"].forEach((id) => {
    $("#" + id).addEventListener("keydown", (event) => {
      if (event.key === "Enter") applyRgbInputs();
    });
    $("#" + id).addEventListener("change", applyRgbInputs);
  });

  ["hsl-h", "hsl-s", "hsl-l"].forEach((id) => {
    $("#" + id).addEventListener("keydown", (event) => {
      if (event.key === "Enter") applyHslInputs();
    });
    $("#" + id).addEventListener("change", applyHslInputs);
  });

  $("#random-color").addEventListener("click", () => {
    const hex = U.rgbToHex(
      Math.floor(Math.random() * 256),
      Math.floor(Math.random() * 256),
      Math.floor(Math.random() * 256),
    );
    setColor(hex, { message: `Generated ${hex}` });
  });

  $("#save-favorite").addEventListener("click", saveCurrentColor);
  $("#regenerate-palette").addEventListener("click", () => {
    renderPalette();
    renderWheel();
    toast("Palette regenerated.");
  });
  $("#harmony-select").addEventListener("change", () => {
    renderPalette();
    renderWheel();
  });

  $("#copy-hex").addEventListener("click", () =>
    copyText(state.color, `${state.color} copied.`),
  );
  $("#copy-palette").addEventListener("click", () =>
    copyText(getPalette().join(", "), "Palette HEX values copied."),
  );

  $("#gradient-start").addEventListener("input", renderGradient);
  $("#gradient-end").addEventListener("input", renderGradient);
  $("#gradient-angle").addEventListener("input", renderGradient);

  $("#swap-gradient").addEventListener("click", () => {
    const start = $("#gradient-start").value;
    $("#gradient-start").value = $("#gradient-end").value;
    $("#gradient-end").value = start;
    renderGradient();
  });

  $("#copy-gradient").addEventListener("click", () =>
    copyText($("#gradient-css").textContent, "Gradient CSS copied."),
  );
  $("#copy-gradient-code").addEventListener("click", () =>
    copyText($("#gradient-css").textContent, "Gradient code copied."),
  );

  $("#contrast-text").addEventListener("input", renderContrast);
  $("#contrast-bg").addEventListener("input", renderContrast);
  $("#vision-mode").addEventListener("change", renderVision);

  $("#clear-favorites").addEventListener("click", () => {
    if (!state.favorites.length) {
      toast("There are no saved colors to clear.");
      return;
    }
    state.favorites = [];
    saveFavorites();
    renderFavorites();
    toast("All favorites cleared.");
  });

  $$(".export-option").forEach((button) => {
    button.addEventListener("click", () =>
      exportPalette(button.dataset.export),
    );
  });

  // Keep the sidebar's active item synchronized with navigation.
  $$(".nav-item").forEach((link) => {
    link.addEventListener("click", () => {
      $$(".nav-item").forEach((item) => item.classList.remove("active"));
      link.classList.add("active");
    });
  });

  // Initial rendering
  setColor(state.color);
  renderFavorites();
  renderGradient();
  renderContrast();
  renderVision();
});
