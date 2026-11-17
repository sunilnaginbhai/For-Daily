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
