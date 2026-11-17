window.NatureWallpaper = class NatureWallpaper {
  static interval = 300000;
  static scenes = {
    day: [
      ["1441974231531-c6227db76b6e", "Forest canopy"],
      ["1470770841072-f978cf4d019e", "Mountain lake"],
      ["1500534623283-312aade485b7", "Open landscape"],
    ],
    golden: [
      ["1470071459604-3b5ec3a7fe05", "Morning mist"],
      ["1475924156734-496f6cac6ec1", "Coastal light"],
    ],
    night: [
      ["1419242902214-272b3f66ee7a", "Stars above the mountains"],
      ["1519681393784-d120267933ba", "Alpine night"],
    ],
  };
  static period(date) {
    const hour = date.getHours();
    return hour < 5 || hour >= 20
      ? "night"
      : hour < 8 || hour >= 17
        ? "golden"
        : "day";
  }
  static url(id, quality) {
    const width = quality === "hd" ? 1920 : 3840;
    return `https://images.unsplash.com/photo-${id}?fm=jpg&w=${width}&h=${(width * 9) / 16}&fit=crop&q=85`;
  }
  constructor(onChange, load) {
    this.onChange = onChange;
    this.load =
      load ||
      ((url) =>
        new Promise((resolve, reject) => {
          const image = new Image();
          const timeout = setTimeout(() => {
            image.src = "";
            reject(Error("Image load timed out"));
          }, 25000);
          image.onload = () => {
            clearTimeout(timeout);
            resolve();
          };
          image.onerror = () => {
            clearTimeout(timeout);
            reject(Error("Image unavailable"));
          };
          image.src = url;
        }));
    this.enabled = false;
    this.quality = "4k";
    this.current = "";
    this.generation = 0;
    this.busy = false;
    this.status = "Off";
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && this.enabled) this.refresh();
    });
    window.addEventListener("online", () => {
      if (this.enabled) this.refresh();
    });
  }
  sync(enabled, quality) {
    enabled = enabled === true;
    quality = quality === "hd" ? "hd" : "4k";
    if (enabled === this.enabled && quality === this.quality) return;
    this.generation++;
    clearTimeout(this.timer);
    this.busy = false;
    this.key = "";
    this.enabled = enabled;
    this.quality = quality;
    if (!enabled) {
      this.current = "";
      this.status = "Off";
      return;
    }
    this.refresh();
  }
  schedule(retry = false) {
    clearTimeout(this.timer);
    if (!this.enabled) return;
    this.nextAt = retry
      ? Date.now() + 60000
      : (Math.floor(Date.now() / NatureWallpaper.interval) + 1) *
        NatureWallpaper.interval;
    this.timer = setTimeout(
      () => this.refresh(),
      this.nextAt - Date.now() + 100,
    );
  }
  async refresh(date = new Date()) {
    if (!this.enabled || this.busy || document.hidden) return;
    const slot = Math.floor(+date / NatureWallpaper.interval),
      period = NatureWallpaper.period(date),
      key = `${slot}:${period}:${this.quality}`;
    if (key === this.key) {
      this.schedule();
      return;
    }
    this.busy = true;
    this.status = "Loading nature photo…";
    const generation = this.generation,
      pool = NatureWallpaper.scenes[period];
    let loaded = false;
    for (let attempt = 0; attempt < pool.length; attempt++) {
      if (generation !== this.generation) return;
      const [id, title] = pool[(slot + attempt) % pool.length];
      const url = NatureWallpaper.url(id, this.quality);
      try {
        await this.load(url);
        if (generation !== this.generation) return;
        this.current = url;
        this.key = key;
        this.photo = { id, title, period };
        this.status = `${title} · ${period === "golden" ? "Golden hour" : period === "day" ? "Daylight" : "Night"} · ${this.quality === "hd" ? "HD" : "4K"}`;
        loaded = true;
        break;
      } catch {
        /* Keep the displayed image while trying the next scene. */
      }
    }
    if (generation !== this.generation) return;
    this.busy = false;
    if (!loaded)
      this.status =
        "Could not load a photo. Keeping your background; retrying in a minute.";
    this.schedule(!loaded);
    this.onChange();
  }
};
