window.DragMotion = {
  reduced() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  },
  capture() {
    return new Map(
      [...document.querySelectorAll("#board .task,#notes .note")].map((el) => [
        el.dataset.id || el.dataset.noteId,
        el.getBoundingClientRect(),
      ]),
    );
  },
  settle(before) {
    if (!before || this.reduced()) return;
    document.querySelectorAll("#board .task,#notes .note").forEach((el) => {
      const old = before.get(el.dataset.id || el.dataset.noteId),
        rect = el.getBoundingClientRect();
      if (!old || !rect.width || !el.animate) return;
      const x = old.left - rect.left,
        y = old.top - rect.top;
      if (x || y)
        el.animate(
          [
            { transform: `translate(${x}px,${y}px)` },
            { transform: "translate(0,0)" },
          ],
          { duration: 150, easing: "ease-out" },
        );
    });
  },
  start(event) {
    const card = event.target.closest(".task,.note");
    if (!card || !event.dataTransfer?.setDragImage) return;
    const ghost = card.cloneNode(true);
    ghost.classList.remove("dragging", "drop-target");
    ghost.classList.add("drag-preview");
    ghost.removeAttribute("id");
    ghost.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    const rect = card.getBoundingClientRect();
    ghost.style.width = rect.width + "px";
    ghost.style.left = rect.left + "px";
    ghost.style.top = rect.top + "px";
    document.body.append(ghost);
    event.dataTransfer.setDragImage(ghost, 30, 20);
    this.ghost = ghost;
    setTimeout(() => {
      ghost.style.left = "-10000px";
    }, 0);
    document.body.classList.add("is-dragging");
  },
  end() {
    this.ghost?.remove();
    this.ghost = null;
    document.body.classList.remove("is-dragging");
  },
};
document.addEventListener("dragstart", (event) => DragMotion.start(event));
document.addEventListener("dragend", () => DragMotion.end());
document.addEventListener("drop", () => DragMotion.end());
