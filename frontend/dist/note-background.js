window.NoteBackgroundEditor = class NoteBackgroundEditor {
  constructor(select, encode) {
    this.select = select;
    this.encode = encode;
    this.image = "";
    this.generation = 0;
    this.busy = false;
    select("#note-bg-upload").onchange = (event) => this.upload(event);
    select("#note-bg-remove").onclick = () => {
      this.generation++;
      this.busy = false;
      this.select("#save-item").disabled = false;
      this.image = "";
      this.select("#note-bg-status").textContent =
        "Image removed. Save to apply.";
      this.preview();
    };
    ["#title-input", "#body-input", "#color-input"].forEach((selector) => {
      select(selector).addEventListener("input", () => this.preview());
    });
    [
      "#note-use-color",
      "#note-custom-color",
      "#note-bg-position",
      "#note-bg-overlay",
    ].forEach((selector) => {
      select(selector).addEventListener("input", () => this.preview());
      select(selector).addEventListener("change", () => this.preview());
    });
  }

  reset(note) {
    this.generation++;
    this.image = note.background || "";
    this.busy = false;
    this.select("#save-item").disabled = false;
    this.select("#note-bg-upload").value = "";
    this.select("#note-bg-status").textContent = "";
    this.select("#note-use-color").checked = !!note.customColor;
    this.select("#note-custom-color").value = BackgroundStyle.color(
      note.customColor,
    );
    this.select("#note-bg-position").value = BackgroundStyle.position(
      note.imagePosition,
    );
    this.select("#note-bg-overlay").value = BackgroundStyle.clamp(
      note.imageOverlay,
      20,
      90,
      74,
    );
    this.preview();
  }

  settings() {
    return {
      customColor: this.select("#note-use-color").checked
        ? this.select("#note-custom-color").value
        : "",
      imagePosition: this.select("#note-bg-position").value,
      imageOverlay: Number(this.select("#note-bg-overlay").value),
    };
  }

  preview() {
    const preview = this.select("#note-bg-preview");
    preview.className = this.select("#color-input").value;
    preview.classList.toggle("has-image", !!this.image);
    preview.style.backgroundImage = this.image ? `url("${this.image}")` : "";
    BackgroundStyle.applyNote(preview, {
      background: this.image,
      ...this.settings(),
    });
    this.select("#note-bg-overlay-value").textContent =
      this.settings().imageOverlay + "%";
    this.select("#note-custom-color").disabled =
      !this.select("#note-use-color").checked;
    this.select(".note-image-controls").hidden = !this.image;
    this.select("#note-preview-title").textContent =
      this.select("#title-input").value || "Your note";
    this.select("#note-preview-body").textContent =
      this.select("#body-input").value || "Start writing.";
    this.select("#note-bg-remove").hidden = !this.image;
  }

  async upload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const generation = ++this.generation;
    this.busy = true;
    this.select("#save-item").disabled = true;
    this.select("#note-bg-status").textContent = "Preparing image…";
    try {
      const image = await this.encode(file, 1280);
      if (generation !== this.generation) return;
      this.image = image;
      this.preview();
      this.select("#note-bg-status").textContent =
        "Image ready. Save to apply.";
    } catch (error) {
      if (generation === this.generation)
        this.select("#note-bg-status").textContent = error.message;
    } finally {
      if (generation === this.generation) {
        this.busy = false;
        this.select("#save-item").disabled = false;
        event.target.value = "";
      }
    }
  }
};
