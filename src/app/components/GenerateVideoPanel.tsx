"use client";

import { useEffect, useState } from "react";

type JobStatus = "queued" | "processing" | "completed" | "failed";

export default function GenerateVideoPanel() {
  const [prompt, setPrompt] = useState("");
  const [job, setJob] = useState<any>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (!prompt.trim()) return;

    setLoading(true);
    setProgress(5);

    const r = await fetch("/api/generate/video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, rating: "ADULT" }),
    });

    const data = await r.json();
    setJob(data);
    setStatus("queued");
    setLoading(false);
  }

  // Poll job status
  useEffect(() => {
    if (!job?.id) return;

    const interval = setInterval(async () => {
      const r = await fetch(`/api/adult/status?jobId=${job.id}`);
      const data = await r.json();

      setStatus(data.status);

      if (data.status === "queued") {
        setProgress((p) => Math.min(p + 5, 25));
      }

      if (data.status === "processing") {
        setProgress((p) => Math.min(p + 6, 90));
      }

      if (data.status === "completed") {
        setProgress(100);
        clearInterval(interval);
      }

      if (data.status === "failed") {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [job]);

  return (
    <div className="holoCard generatorPanel">
      <h2 className="gradientText">Video Generator</h2>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe the video scene..."
        className="holoInput"
      />

      <button onClick={generate} disabled={loading} className="primaryBtn">
        {loading ? "Initializing..." : "Generate Video"}
      </button>

      {status && (
        <div className="progressContainer">
          <div className="progressLabel">
            {status === "queued" && "Queued in render pipeline"}
            {status === "processing" && "Rendering video..."}
            {status === "completed" && "Video ready"}
            {status === "failed" && "Generation failed"}
          </div>

          <div className="progressBar">
            <div className="progressFill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {status === "completed" && job?.id && (
        <div className="previewContainer">
          <video
            controls
            className="generatedVideo"
            src={`/api/adult/stream?jobId=${job.id}`}
          />
        </div>
      )}
    </div>
  );
}
