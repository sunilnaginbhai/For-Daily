window.BackgroundStyle = {
  clamp(value, min, max, fallback) {
    const number = Number(value);
    return Number.isFinite(number)
      ? Math.min(max, Math.max(min, number))
      : fallback;
  },
  color(value, fallback = "#f7f5ef") {
    return /^#[0-9a-f]{6}$/i.test(value || "") ? value : fallback;
  },
  position(value) {
    return ["center", "top", "bottom", "left", "right"].includes(value)
      ? value
      : "center";
  },
  foreground(color) {
    const hex = this.color(color).slice(1);
    const rgb = [0, 2, 4].map((offset) => {
      const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
      return channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4;
    });
    const luminance = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    return luminance > 0.179 ? "#20201e" : "#f7f5ef";
  },
  texture(kind, color) {
    const stroke = this.foreground(color);
    const shape = {
      diagonal: `<path d="m-6 6 12-12M0 24 24 0m-6 30 12-12" stroke="${stroke}" stroke-width=".7"/>`,
      leaves: `<path d="M3 20Q0 5 20 3Q23 18 3 20ZM3 20 17 6" fill="none" stroke="${stroke}" stroke-width=".7"/>`,
      waves: `<path d="M-6 6Q0-2 6 6T18 6T30 6M-6 18Q0 10 6 18T18 18T30 18" fill="none" stroke="${stroke}" stroke-width=".7"/>`,
      crosses: `<path d="M8 12h8m-4-4v8" stroke="${stroke}" stroke-width=".7"/>`,
      contour: `<path d="M-8 24Q24-8 32 24M-8 16Q16-8 32 16M-8 8Q8-8 32 8" fill="none" stroke="${stroke}" stroke-width=".7"/>`,
      woven: `<path d="M0 4h12m0 8h12M0 20h12M4 12v12M20 0v12" stroke="${stroke}" stroke-width=".7"/>`,
      dots: `<circle cx="2" cy="2" r="1" fill="${stroke}"/>`,
      grid: `<path d="M24 0H0V24" fill="none" stroke="${stroke}" stroke-width=".6"/>`,
      lines: `<path d="M0 23.5H24" stroke="${stroke}" stroke-width=".6"/>`,
    }[kind];
    return shape
      ? `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">${shape}</svg>`)}")`
      : "";
  },
  applyNote(element, note) {
    const custom = (note.customColor && this.color(note.customColor, "")) || "";
    const hasImage = !!note.background;
    element.style.backgroundColor = custom;
    element.style.color = hasImage
      ? "#f7f5ef"
      : custom
        ? this.foreground(custom)
        : "";
    element.style.backgroundImage = hasImage ? `url("${note.background}")` : "";
    element.style.backgroundPosition = this.position(note.imagePosition);
    element.style.setProperty(
      "--note-overlay",
      this.clamp(note.imageOverlay, 20, 90, 74) / 100,
    );
  },
};
