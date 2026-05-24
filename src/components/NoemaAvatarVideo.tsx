"use client";

import { useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

export function NoemaAvatarVideo({ src = "/NoemaAvitar.mp4" }: { src?: string }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [muted, setMuted] = useState(true);

    function toggleMute() {
        const v = videoRef.current;
        if (!v) return;
        v.muted = !v.muted;
        setMuted(v.muted);
    }

    return (
        <div className="relative w-full">
            <video
                ref={videoRef}
                src={src}
                autoPlay
                playsInline
                muted
                className="w-full h-auto rounded-2xl"
            />
            <button
                onClick={toggleMute}
                aria-label={muted ? "Unmute" : "Mute"}
                className="absolute bottom-2 right-2 flex items-center justify-center rounded-full bg-black/50 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/70"
            >
                {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
        </div>
    );
}
