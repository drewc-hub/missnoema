"use client";

import { useState, useEffect } from "react";

export default function Sidebar() {
  const [style, setStyle] = useState("realistic");

  useEffect(() => {
    const saved = localStorage.getItem("visualStyle");
    if (saved) setStyle(saved);
  }, []);

  function handleChange(val: string) {
    setStyle(val);
    localStorage.setItem("visualStyle", val);
    window.dispatchEvent(new Event("visual-style-change"));
  }
  const [voice, setVoice] = useState(false);

  function handleVoiceToggle() {
    const newVal = !voice;
    setVoice(newVal);
    localStorage.setItem("voiceMode", String(newVal));
  }

  return (
    <div className="sidebar">
      <h2>Noema</h2>

      <div style={{ marginTop: 20 }}>
        <h4>Visual Style</h4>
        <select value={style} onChange={(e) => handleChange(e.target.value)}>
          <option value="realistic">Realistic</option>
          <option value="anime">Anime</option>
        </select>

        <div style={{ marginTop: 20 }}>
          <h4>Voice Mode</h4>
          <button onClick={handleVoiceToggle}>
            {voice ? "Disable Voice" : "Enable Voice"}
          </button>
        </div>
      </div>
    </div>
  );
}
