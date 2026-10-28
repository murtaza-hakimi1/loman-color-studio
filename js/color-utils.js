"use strict";

(function (root) {
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const byte = (value) => Math.round(clamp(Number(value) || 0, 0, 255));
  const percent = (value) => clamp(Number(value) || 0, 0, 100);

  function normalizeHex(input) {
    let hex = String(input ?? "")
      .trim()
      .replace(/^#/, "");
    if (/^[0-9a-f]{3}$/i.test(hex)) {
      hex = hex
        .split("")
        .map((char) => char + char)
        .join("");
    }
    if (!/^[0-9a-f]{6}$/i.test(hex)) {
      throw new Error("Enter a valid 3- or 6-digit HEX color.");
    }
    return "#" + hex.toUpperCase();
  }

  function hexToRgb(hex) {
    const normalized = normalizeHex(hex).slice(1);
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
    };
  }

  function rgbToHex(r, g, b) {
    return (
      "#" +
      [r, g, b]
        .map((value) => byte(value).toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase()
    );
  }

  function rgbToHsl(r, g, b) {
    r = byte(r) / 255;
    g = byte(g) / 255;
    b = byte(b) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (delta !== 0) {
      s = delta / (1 - Math.abs(2 * l - 1));
      switch (max) {
        case r:
          h = 60 * (((g - b) / delta) % 6);
          break;
        case g:
          h = 60 * ((b - r) / delta + 2);
          break;
        case b:
          h = 60 * ((r - g) / delta + 4);
          break;
      }
    }

    return {
      h: Math.round((h + 360) % 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  }

  function hslToRgb(h, s, l) {
    h = ((Number(h) % 360) + 360) % 360;
    s = percent(s) / 100;
    l = percent(l) / 100;

    const chroma = (1 - Math.abs(2 * l - 1)) * s;
    const section = h / 60;
    const x = chroma * (1 - Math.abs((section % 2) - 1));
    let r = 0,
      g = 0,
      b = 0;

    if (section < 1) [r, g, b] = [chroma, x, 0];
    else if (section < 2) [r, g, b] = [x, chroma, 0];
    else if (section < 3) [r, g, b] = [0, chroma, x];
    else if (section < 4) [r, g, b] = [0, x, chroma];
    else if (section < 5) [r, g, b] = [x, 0, chroma];
    else [r, g, b] = [chroma, 0, x];

    const m = l - chroma / 2;
    return {
      r: byte((r + m) * 255),
      g: byte((g + m) * 255),
      b: byte((b + m) * 255),
    };
  }

  function rgbToCmyk(r, g, b) {
    r = byte(r) / 255;
    g = byte(g) / 255;
    b = byte(b) / 255;
    const k = 1 - Math.max(r, g, b);
    if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };

    return {
      c: Math.round(((1 - r - k) / (1 - k)) * 100),
      m: Math.round(((1 - g - k) / (1 - k)) * 100),
      y: Math.round(((1 - b - k) / (1 - k)) * 100),
      k: Math.round(k * 100),
    };
  }

  function rgbToHsv(r, g, b) {
    r = byte(r) / 255;
    g = byte(g) / 255;
    b = byte(b) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let h = 0;

    if (delta) {
      if (max === r) h = 60 * (((g - b) / delta) % 6);
      else if (max === g) h = 60 * ((b - r) / delta + 2);
      else h = 60 * ((r - g) / delta + 4);
    }

    return {
      h: (h + 360) % 360,
      s: max === 0 ? 0 : delta / max,
      v: max,
    };
  }

  function relativeLuminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    const linearize = (channel) => {
      const value = channel / 255;
      return value <= 0.04045
        ? value / 12.92
        : Math.pow((value + 0.055) / 1.055, 2.4);
    };
    return (
      0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
    );
  }

  function contrastRatio(foreground, background) {
    const a = relativeLuminance(foreground);
    const b = relativeLuminance(background);
    const lighter = Math.max(a, b);
    const darker = Math.min(a, b);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function rotateHue(hex, degrees, saturation, lightness) {
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return rgbToHex(
      ...Object.values(
        hslToRgb(hsl.h + degrees, saturation ?? hsl.s, lightness ?? hsl.l),
      ),
    );
  }

  function makePalette(hex, mode = "complementary") {
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const hue = hsl.h;
    const s = hsl.s;
    const l = hsl.l;

    const at = (offset, sat = s, light = l) =>
      rgbToHex(...Object.values(hslToRgb(hue + offset, sat, light)));

    let colors;
    switch (mode) {
      case "analogous":
        colors = [-60, -30, 0, 30, 60].map((d) => at(d));
        break;
      case "triadic":
        colors = [0, 120, 240].map((d) => at(d));
        colors = [at(-120, s, clamp(l + 12, 0, 100)), ...colors];
        colors.push(at(120, s, clamp(l - 12, 0, 100)));
        break;
      case "split":
        colors = [0, 150, 210].map((d) => at(d));
        colors.push(at(-25, s, clamp(l + 15, 0, 100)));
        colors.push(at(25, s, clamp(l - 15, 0, 100)));
        break;
      case "tetradic":
        colors = [0, 90, 180, 270, 45].map((d) => at(d));
        break;
      case "monochromatic":
        colors = [
          at(0, s, 18),
          at(0, s, 35),
          at(0, s, l),
          at(0, s, 78),
          at(0, s, 92),
        ];
        break;
      case "complementary":
      default:
        colors = [
          at(0, s, clamp(l - 20, 0, 100)),
          at(0, s, l),
          at(180, s, l),
          at(180, s, clamp(l + 15, 0, 100)),
          at(0, clamp(s - 25, 0, 100), clamp(l + 25, 0, 100)),
        ];
    }

    return [...new Set(colors.map(normalizeHex))];
  }

  function simulateVision(hex, mode) {
    const { r, g, b } = hexToRgb(hex);
    const matrices = {
      protanopia: [
        [0.56667, 0.43333, 0],
        [0.55833, 0.44167, 0],
        [0, 0.24167, 0.75833],
      ],
      deuteranopia: [
        [0.625, 0.375, 0],
        [0.7, 0.3, 0],
        [0, 0.3, 0.7],
      ],
      tritanopia: [
        [0.95, 0.05, 0],
        [0, 0.43333, 0.56667],
        [0, 0.475, 0.525],
      ],
      achromatopsia: [
        [0.2126, 0.7152, 0.0722],
        [0.2126, 0.7152, 0.0722],
        [0.2126, 0.7152, 0.0722],
      ],
    };

    const matrix = matrices[mode];
    if (!matrix) return normalizeHex(hex);

    return rgbToHex(
      matrix[0][0] * r + matrix[0][1] * g + matrix[0][2] * b,
      matrix[1][0] * r + matrix[1][1] * g + matrix[1][2] * b,
      matrix[2][0] * r + matrix[2][1] * g + matrix[2][2] * b,
    );
  }

  function toCss(colors) {
    return (
      ":root {\n" +
      colors
        .map((hex, i) => `  --color-${i + 1}: ${normalizeHex(hex)};`)
        .join("\n") +
      "\n}\n"
    );
  }

  function toScss(colors) {
    return (
      colors
        .map((hex, i) => `$color-${i + 1}: ${normalizeHex(hex)};`)
        .join("\n") + "\n"
    );
  }

  function toJson(colors) {
    return JSON.stringify(
      {
        name: "Loman Studio Palette",
        colors: colors.map((hex, i) => {
          const normalized = normalizeHex(hex);
          const rgb = hexToRgb(normalized);
          return {
            name: `Color ${i + 1}`,
            hex: normalized,
            rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
            hsl: (() => {
              const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
              return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
            })(),
          };
        }),
      },
      null,
      2,
    );
  }

  function toSvg(colors) {
    const width = 140;
    const height = 120;
    const swatches = colors
      .map((hex, i) => {
        const x = i * width;
        const label = normalizeHex(hex);
        return `<g><rect x="${x}" y="0" width="${width}" height="82" fill="${label}"/><text x="${x + 8}" y="105" font-size="12" fill="#222" font-family="monospace">${label}</text></g>`;
      })
      .join("");

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width * colors.length}" height="${height}" viewBox="0 0 ${width * colors.length} ${height}">${swatches}</svg>\n`;
  }

  function toGpl(colors) {
    const lines = ["GIMP Palette", "Name: Loman Studio Palette", "#"];
    colors.forEach((hex, index) => {
      const { r, g, b } = hexToRgb(hex);
      lines.push(
        `${String(r).padStart(3)} ${String(g).padStart(3)} ${String(b).padStart(3)} Color ${index + 1}`,
      );
    });
    return lines.join("\n") + "\n";
  }

  const api = {
    normalizeHex,
    hexToRgb,
    rgbToHex,
    rgbToHsl,
    hslToRgb,
    rgbToCmyk,
    rgbToHsv,
    relativeLuminance,
    contrastRatio,
    rotateHue,
    makePalette,
    simulateVision,
    toCss,
    toScss,
    toJson,
    toSvg,
    toGpl,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.ChromaUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
