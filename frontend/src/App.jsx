import React, { useEffect, useState } from "react";
import appearancePresetsUrl from "../dist/appearance-presets.js?url";
import appUrl from "../dist/app.js?url";
import backgroundStyleUrl from "../dist/background-style.js?url";
import dragMotionUrl from "../dist/drag-motion.js?url";
import legacyDocument from "../dist/index.html?raw";
import natureWallpaperUrl from "../dist/nature-wallpaper.js?url";
import noteBackgroundUrl from "../dist/note-background.js?url";
import EmailDashboard from "./EmailDashboard.jsx";

const shell = legacyDocument.match(/<body[^>]*>([\s\S]*?)\s*<script\b/i);

if (!shell) {
  throw new Error("Could not load the workspace interface.");
}

const legacyScripts = [
  natureWallpaperUrl,
  appearancePresetsUrl,
  dragMotionUrl,
  backgroundStyleUrl,
  noteBackgroundUrl,
  appUrl,
];

function loadLegacyScripts() {
  return legacyScripts.reduce(
    (previous, scriptUrl) =>
      previous.then(
        () =>
          new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = scriptUrl;
            script.onload = resolve;
            script.onerror = () =>
              reject(new Error(`Could not load ${scriptUrl}.`));
            document.body.append(script);
          }),
      ),
    Promise.resolve(),
  );
}

export default function App() {
  const [loadError, setLoadError] = useState("");
  const [emailOpen, setEmailOpen] = useState(
    () => new URLSearchParams(window.location.search).get("email") === "1",
  );

  useEffect(() => {
    let active = true;

    loadLegacyScripts().catch((error) => {
      if (active) setLoadError(error.message);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleNavigation = (event) => {
      if (!(event.target instanceof Element)) return;
      const emailButton = event.target.closest("#email-nav");
      if (emailButton) {
        setEmailOpen(true);
      } else if (event.target.closest("nav button[data-view]")) {
        setEmailOpen(false);
      }
    };

    document.addEventListener("click", handleNavigation);
    return () => document.removeEventListener("click", handleNavigation);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("email-open", emailOpen);
    document
      .querySelector("#email-nav")
      ?.classList.toggle("active", emailOpen);
    return () => document.body.classList.remove("email-open");
  }, [emailOpen]);

  return (
    <>
      <div
        style={{ display: "contents" }}
        dangerouslySetInnerHTML={{ __html: shell[1] }}
      />
      {loadError && <p role="alert">{loadError}</p>}
      <EmailDashboard isActive={emailOpen} onClose={() => setEmailOpen(false)} />
    </>
  );
}
