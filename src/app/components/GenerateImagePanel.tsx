"use client";
import { useEffect, useState } from "react";

type JobStatus = "queued" | "processing" | "completed" | "failed";

export default function GenerateImagePanel() {
  const [prompt, setPrompt] = useState("");
  const [job, setJob] = useState<any>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (!prompt.trim()) return;

    setLoading(true);
    setProgress(5);

    const r = await fetch("/api/generate/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, rating: "ADULT" }),
    });

    const text = await r.text();
    consoole.log("RAW RESPONSE:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("Not valid JSON response");
      setLoading(false);
      return;
    }
    setJob(data);
    setStatus("queued");
    setLoading(false);

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
          setProgress((p) => Math.min(p + 8, 85));
        }

        if (data.status === "completed") {
          setProgress(100);
          clearInterval(interval);
        }

        if (data.status === "failed") {
          clearInterval(interval);
        }
      }, 1500);

      return () => clearInterval(interval);
    }, [job]);

    return (
      <div className="holoCard generatorPanel">
        <h2 className="gradientText">Media Generator</h2>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your vision..."
          className="holoInput"
        />

        <button onClick={generate} disabled={loading} className="primaryBtn">
          {loading ? "Initializing..." : "Generate"}
        </button>

        {status && (
          <div className="progressContainer">
            <div className="progressLabel">
              {status === "queued" && "Queued in render pipeline"}
              {status === "processing" && "Rendering media..."}
              {status === "completed" && "Generation complete"}
              {status === "failed" && "Generation failed"}
            </div>

            <div className="progressBar">
              <div className="progressFill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {status === "completed" && job?.id && (
          <div className="previewContainer">
            <img
              src={`/api/adult/stream?jobId=${job.id}`}
              alt="Generated"
              className="generatedImage"
            />
          </div>
        )}
      </div>
    );
  }
}
