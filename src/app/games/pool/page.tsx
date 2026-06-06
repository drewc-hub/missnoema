"use client";

import { useEffect, useRef, useState } from "react";

type BallGroup = "cue" | "solid" | "stripe" | "eight";
type Player = 1 | 2;

type Ball = {
  id: number;
  label: string;
  group: BallGroup;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pocketed: boolean;
};

type AimState = {
  active: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
};

type GameState = {
  balls: Ball[];
  currentPlayer: Player;
  groups: Record<Player, "solid" | "stripe" | null>;
  shotActive: boolean;
  shotPocketed: number[];
  cueScratch: boolean;
  gameOver: boolean;
  winner: Player | null;
  message?: string;
  soundEvents: Array<"shot" | "rail" | "hit" | "pocket">;
};

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

const TABLE = {
  width: 960,
  height: 540,
  cushion: 42,
  pocketRadius: 26,
};

const BALL_RADIUS = 12.5;
const MAX_SHOT_SPEED = 20;
const FRICTION = 0.996;
const STOP_SPEED = 0.035;
const RESTITUTION = 0.94;
const PHYSICS_STEPS = 4;

let feltNoiseCanvas: HTMLCanvasElement | null = null;

const BALL_META: Array<{ id: number; group: BallGroup; color: string }> = [
  { id: 1, group: "solid", color: "#f4c542" },
  { id: 2, group: "solid", color: "#2563eb" },
  { id: 3, group: "solid", color: "#dc2626" },
  { id: 4, group: "solid", color: "#7c3aed" },
  { id: 5, group: "solid", color: "#ea580c" },
  { id: 6, group: "solid", color: "#16a34a" },
  { id: 7, group: "solid", color: "#7f1d1d" },
  { id: 8, group: "eight", color: "#101010" },
  { id: 9, group: "stripe", color: "#f4c542" },
  { id: 10, group: "stripe", color: "#2563eb" },
  { id: 11, group: "stripe", color: "#dc2626" },
  { id: 12, group: "stripe", color: "#7c3aed" },
  { id: 13, group: "stripe", color: "#ea580c" },
  { id: 14, group: "stripe", color: "#16a34a" },
  { id: 15, group: "stripe", color: "#7f1d1d" },
];

const POCKETS = [
  { x: TABLE.cushion, y: TABLE.cushion },
  { x: TABLE.width / 2, y: TABLE.cushion - 3 },
  { x: TABLE.width - TABLE.cushion, y: TABLE.cushion },
  { x: TABLE.cushion, y: TABLE.height - TABLE.cushion },
  { x: TABLE.width / 2, y: TABLE.height - TABLE.cushion + 3 },
  { x: TABLE.width - TABLE.cushion, y: TABLE.height - TABLE.cushion },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function otherPlayer(player: Player): Player {
  return player === 1 ? 2 : 1;
}

function drawFeltNoise(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = Math.random() * 10 - 5;
    data[i] += noise;
    data[i + 1] += noise;
    data[i + 2] += noise;
  }

  ctx.putImageData(imageData, 0, 0);
}

function getFeltNoiseCanvas(w: number, h: number) {
  if (feltNoiseCanvas && feltNoiseCanvas.width === w && feltNoiseCanvas.height === h) {
    return feltNoiseCanvas;
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, w, h);
    drawFeltNoise(ctx, w, h);
  }

  feltNoiseCanvas = canvas;
  return canvas;
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function makeInitialBalls(): Ball[] {
  const balls: Ball[] = [
    {
      id: 0,
      label: "",
      group: "cue",
      color: "#f8fafc",
      x: TABLE.width * 0.26,
      y: TABLE.height / 2,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS,
      pocketed: false,
    },
  ];

  const rackOrder = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15];
  const startX = TABLE.width * 0.68;
  const startY = TABLE.height / 2;
  const spacingX = BALL_RADIUS * 1.78;
  const spacingY = BALL_RADIUS * 2.08;
  let index = 0;

  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col <= row; col += 1) {
      const number = rackOrder[index];
      const meta = BALL_META.find((item) => item.id === number)!;
      balls.push({
        id: number,
        label: String(number),
        group: meta.group,
        color: meta.color,
        x: startX + row * spacingX,
        y: startY + (col - row / 2) * spacingY,
        vx: 0,
        vy: 0,
        radius: BALL_RADIUS,
        pocketed: false,
      });
      index += 1;
    }
  }

  return balls;
}

function makeInitialGame(): GameState {
  return {
    balls: makeInitialBalls(),
    currentPlayer: 1,
    groups: { 1: null, 2: null },
    shotActive: false,
    shotPocketed: [],
    cueScratch: false,
    gameOver: false,
    winner: null,
    soundEvents: [],
  };
}

function pointerToCanvas(event: PointerEvent, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * TABLE.width,
    y: ((event.clientY - rect.top) / rect.height) * TABLE.height,
  };
}

function allStopped(balls: Ball[]) {
  return balls.every((ball) => ball.pocketed || Math.hypot(ball.vx, ball.vy) < STOP_SPEED);
}

function playerClearedGroup(game: GameState, player: Player) {
  const group = game.groups[player];
  if (!group) return false;
  return game.balls.every((ball) => ball.group !== group || ball.pocketed);
}

function settleShot(game: GameState) {
  const player = game.currentPlayer;
  const opponent = otherPlayer(player);
  const pocketed = game.shotPocketed
    .map((id) => game.balls.find((ball) => ball.id === id))
    .filter((ball): ball is Ball => Boolean(ball));
  const objectPocketed = pocketed.filter((ball) => ball.id !== 0);
  const eightPocketed = objectPocketed.some((ball) => ball.group === "eight");

  let message = "";
  let nextPlayer = player;
  let groups = game.groups;
  let winner: Player | null = null;
  let gameOver = false;

  if (eightPocketed) {
    const legalEight = playerClearedGroup(game, player) && !game.cueScratch;
    winner = legalEight ? player : opponent;
    gameOver = true;
    message = legalEight
      ? `Player ${player} legally pockets the 8-ball and wins.`
      : `Player ${player} pockets the 8-ball early or scratches. Player ${opponent} wins.`;
  } else if (game.cueScratch) {
    nextPlayer = opponent;
    message = `Scratch. Player ${opponent} takes the next turn.`;
  } else {
    if (!groups[1] && !groups[2]) {
      const firstGroupBall = objectPocketed.find(
        (ball) => ball.group === "solid" || ball.group === "stripe",
      );
      if (firstGroupBall) {
        groups = {
          ...groups,
          [player]: firstGroupBall.group,
          [opponent]: firstGroupBall.group === "solid" ? "stripe" : "solid",
        };
        message = `Player ${player} is ${firstGroupBall.group}s. Player ${opponent} is ${groups[opponent]}s.`;
      } else {
        nextPlayer = opponent;
        message = `No object ball pocketed. Player ${opponent}'s turn.`;
      }
    } else {
      const playerGroup = groups[player];
      const keptTurn = objectPocketed.some((ball) => ball.group === playerGroup);
      if (keptTurn) {
        message = `Player ${player} pockets ${playerGroup} and keeps the table.`;
      } else {
        nextPlayer = opponent;
        message = `No ${playerGroup} pocketed. Player ${opponent}'s turn.`;
      }
    }
  }

  const cue = game.balls[0];
  if (game.cueScratch) {
    cue.pocketed = false;
    cue.x = TABLE.width * 0.25;
    cue.y = TABLE.height / 2;
    cue.vx = 0;
    cue.vy = 0;
  }

  return {
    ...game,
    currentPlayer: nextPlayer,
    groups,
    shotActive: false,
    shotPocketed: [],
    cueScratch: false,
    gameOver,
    winner,
    message,
  };
}

function drawPoolTable(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, TABLE.width, TABLE.height);

  const rail = TABLE.cushion;
  const feltX = rail;
  const feltY = rail;
  const feltW = TABLE.width - rail * 2;
  const feltH = TABLE.height - rail * 2;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 16;
  const wood = ctx.createLinearGradient(0, 0, TABLE.width, TABLE.height);
  wood.addColorStop(0, "#8b542c");
  wood.addColorStop(0.34, "#3a2011");
  wood.addColorStop(0.68, "#1f120b");
  wood.addColorStop(1, "#7a4525");
  ctx.fillStyle = wood;
  ctx.beginPath();
  roundedRectPath(ctx, 7, 7, TABLE.width - 14, TABLE.height - 14, 34);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  roundedRectPath(ctx, 12, 12, TABLE.width - 24, TABLE.height - 24, 28);
  ctx.clip();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#f8d49b";
  for (let x = 20; x < TABLE.width; x += 70) {
    ctx.fillRect(x, 8, 7, TABLE.height - 16);
  }
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  roundedRectPath(ctx, feltX, feltY, feltW, feltH, 18);
  ctx.clip();

  const felt = ctx.createRadialGradient(
    TABLE.width * 0.42,
    TABLE.height * 0.36,
    36,
    TABLE.width / 2,
    TABLE.height / 2,
    TABLE.width * 0.56,
  );
  felt.addColorStop(0, "#20966a");
  felt.addColorStop(0.5, "#126f4d");
  felt.addColorStop(1, "#07392e");
  ctx.fillStyle = felt;
  ctx.fillRect(feltX, feltY, feltW, feltH);

  ctx.globalAlpha = 0.045;
  ctx.strokeStyle = "#d7ffee";
  ctx.lineWidth = 1;
  for (let y = feltY - 80; y < TABLE.height; y += 9) {
    ctx.beginPath();
    ctx.moveTo(feltX, y);
    ctx.lineTo(feltX + feltW, y + 38);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.075;
  ctx.globalCompositeOperation = "soft-light";
  ctx.drawImage(getFeltNoiseCanvas(feltW, feltH), feltX, feltY);
  ctx.globalCompositeOperation = "source-over";

  const feltShade = ctx.createLinearGradient(0, feltY, 0, feltY + feltH);
  feltShade.addColorStop(0, "rgba(255,255,255,0.08)");
  feltShade.addColorStop(0.16, "rgba(255,255,255,0)");
  feltShade.addColorStop(0.84, "rgba(0,0,0,0)");
  feltShade.addColorStop(1, "rgba(0,0,0,0.22)");
  ctx.fillStyle = feltShade;
  ctx.fillRect(feltX, feltY, feltW, feltH);
  ctx.restore();

  ctx.save();
  ctx.lineWidth = 16;
  ctx.strokeStyle = "rgba(7,26,19,0.62)";
  ctx.beginPath();
  roundedRectPath(ctx, rail - 8, rail - 8, TABLE.width - (rail - 8) * 2, TABLE.height - (rail - 8) * 2, 24);
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.beginPath();
  roundedRectPath(ctx, rail + 8, rail + 8, TABLE.width - (rail + 8) * 2, TABLE.height - (rail + 8) * 2, 12);
  ctx.stroke();
  ctx.restore();

  POCKETS.forEach((pocket) => {
    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, TABLE.pocketRadius + 8, 0, Math.PI * 2);
    const pocketGlow = ctx.createRadialGradient(pocket.x, pocket.y, 4, pocket.x, pocket.y, TABLE.pocketRadius + 9);
    pocketGlow.addColorStop(0, "#000000");
    pocketGlow.addColorStop(0.72, "#030303");
    pocketGlow.addColorStop(1, "#241208");
    ctx.fillStyle = pocketGlow;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, TABLE.pocketRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#020202";
    ctx.fill();
  });
}

function drawBallCore(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
) {
  const gradient = ctx.createRadialGradient(
    x - radius * 0.35,
    y - radius * 0.35,
    radius * 0.1,
    x,
    y,
    radius,
  );

  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.18, color);
  gradient.addColorStop(1, "#111111");

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 5;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();
}

function drawBall(ctx: CanvasRenderingContext2D, ball: Ball) {
  if (ball.pocketed) return;

  drawBallCore(
    ctx,
    ball.x,
    ball.y,
    ball.radius,
    ball.group === "cue" ? "#f8fafc" : ball.color,
  );

  if (ball.group === "stripe") {
    ctx.save();
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius - 1, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(ball.x - ball.radius, ball.y - 5, ball.radius * 2, 10);
    ctx.restore();
  }

  if (ball.id > 0) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = "#f8fafc";
    ctx.fill();
    ctx.fillStyle = "#111827";
    ctx.font = "bold 8px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(ball.label, ball.x, ball.y + 0.5);
  }

  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

function drawCueAndAim(ctx: CanvasRenderingContext2D, cue: Ball, aim: AimState) {
  if (!aim.active || cue.pocketed) return;

  const dx = aim.currentX - aim.startX;
  const dy = aim.currentY - aim.startY;
  const pull = Math.hypot(dx, dy);
  if (pull < 4) return;

  const power = clamp(pull / 165, 0, 1);
  const shotX = -dx / pull;
  const shotY = -dy / pull;
  const pullX = dx / pull;
  const pullY = dy / pull;

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.72)";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([12, 9]);
  ctx.beginPath();
  ctx.moveTo(cue.x, cue.y);
  ctx.lineTo(cue.x + shotX * 250, cue.y + shotY * 250);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = "rgba(56,189,248,0.22)";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(cue.x, cue.y);
  ctx.lineTo(cue.x + shotX * 90, cue.y + shotY * 90);
  ctx.stroke();

  const gap = 20 + power * 34;
  const butt = 205 + power * 52;
  ctx.strokeStyle = "#f3d58b";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cue.x + pullX * gap, cue.y + pullY * gap);
  ctx.lineTo(cue.x + pullX * butt, cue.y + pullY * butt);
  ctx.stroke();

  ctx.strokeStyle = "#3b2415";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cue.x + pullX * (gap + 8), cue.y + pullY * (gap + 8));
  ctx.lineTo(cue.x + pullX * butt, cue.y + pullY * butt);
  ctx.stroke();

  ctx.fillStyle = "rgba(2,6,23,0.65)";
  ctx.fillRect(30, TABLE.height - 42, 190, 12);
  ctx.fillStyle = power > 0.75 ? "#fb7185" : "#38bdf8";
  ctx.fillRect(30, TABLE.height - 42, 190 * power, 12);
  ctx.restore();
}

function simulate(game: GameState) {
  const minX = TABLE.cushion + BALL_RADIUS;
  const maxX = TABLE.width - TABLE.cushion - BALL_RADIUS;
  const minY = TABLE.cushion + BALL_RADIUS;
  const maxY = TABLE.height - TABLE.cushion - BALL_RADIUS;
  const balls = game.balls;

  for (const ball of balls) {
    if (ball.pocketed) continue;

    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.vx *= FRICTION;
    ball.vy *= FRICTION;

    if (ball.x <= minX) {
      ball.x = minX;
      ball.vx = Math.abs(ball.vx) * RESTITUTION;
      if (Math.abs(ball.vx) > 0.8) game.soundEvents.push("rail");
    } else if (ball.x >= maxX) {
      ball.x = maxX;
      ball.vx = -Math.abs(ball.vx) * RESTITUTION;
      if (Math.abs(ball.vx) > 0.8) game.soundEvents.push("rail");
    }

    if (ball.y <= minY) {
      ball.y = minY;
      ball.vy = Math.abs(ball.vy) * RESTITUTION;
      if (Math.abs(ball.vy) > 0.8) game.soundEvents.push("rail");
    } else if (ball.y >= maxY) {
      ball.y = maxY;
      ball.vy = -Math.abs(ball.vy) * RESTITUTION;
      if (Math.abs(ball.vy) > 0.8) game.soundEvents.push("rail");
    }

    if (Math.hypot(ball.vx, ball.vy) < STOP_SPEED) {
      ball.vx = 0;
      ball.vy = 0;
    }
  }

  for (let i = 0; i < balls.length; i += 1) {
    const a = balls[i];
    if (a.pocketed) continue;
    for (let j = i + 1; j < balls.length; j += 1) {
      const b = balls[j];
      if (b.pocketed) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy);
      const minDistance = a.radius + b.radius;
      if (distance <= 0 || distance >= minDistance) continue;

      const nx = dx / distance;
      const ny = dy / distance;
      const overlap = minDistance - distance;
      a.x -= nx * overlap * 0.5;
      a.y -= ny * overlap * 0.5;
      b.x += nx * overlap * 0.5;
      b.y += ny * overlap * 0.5;

      const relativeVx = a.vx - b.vx;
      const relativeVy = a.vy - b.vy;
      const velocityAlongNormal = relativeVx * nx + relativeVy * ny;
      if (velocityAlongNormal <= 0) continue;

      const impulse = velocityAlongNormal * RESTITUTION;
      a.vx -= impulse * nx;
      a.vy -= impulse * ny;
      b.vx += impulse * nx;
      b.vy += impulse * ny;
      if (impulse > 0.35) game.soundEvents.push("hit");
    }
  }

  for (const ball of balls) {
    if (ball.pocketed) continue;
    const pocket = POCKETS.find((item) => Math.hypot(ball.x - item.x, ball.y - item.y) < TABLE.pocketRadius);
    if (!pocket) continue;

    ball.pocketed = true;
    ball.vx = 0;
    ball.vy = 0;
    game.shotPocketed.push(ball.id);
    game.soundEvents.push("pocket");
    if (ball.id === 0) {
      game.cueScratch = true;
    }
  }
}

function playPoolSound(kind: "shot" | "rail" | "hit" | "pocket") {
  const audioWindow = window as AudioWindow;
  const AudioContextClass = audioWindow.AudioContext || audioWindow.webkitAudioContext;
  if (!AudioContextClass) return;

  const audio = new AudioContextClass();
  const now = audio.currentTime;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.connect(gain);
  gain.connect(audio.destination);

  const settings = {
    shot: { frequency: 118, volume: 0.08, duration: 0.09, type: "triangle" as OscillatorType },
    rail: { frequency: 220, volume: 0.035, duration: 0.045, type: "square" as OscillatorType },
    hit: { frequency: 520, volume: 0.04, duration: 0.035, type: "sine" as OscillatorType },
    pocket: { frequency: 82, volume: 0.09, duration: 0.16, type: "triangle" as OscillatorType },
  }[kind];

  oscillator.type = settings.type;
  oscillator.frequency.setValueAtTime(settings.frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, settings.frequency * 0.55), now + settings.duration);
  gain.gain.setValueAtTime(settings.volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + settings.duration);
  oscillator.start(now);
  oscillator.stop(now + settings.duration);
  window.setTimeout(() => void audio.close(), (settings.duration + 0.05) * 1000);
}

export default function PoolGamePage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<GameState>(makeInitialGame());
  const audioUnlockedRef = useRef(false);
  const aimRef = useRef<AimState>({
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });
  const animationRef = useRef<number | null>(null);
  const [status, setStatus] = useState("Player 1 breaks. Drag from the cue ball and release to shoot.");
  const [powerLabel, setPowerLabel] = useState("0%");
  const [uiTick, setUiTick] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;
    const canvasEl = canvas;
    const ctx = context;

    function syncUi(message?: string) {
      if (message) setStatus(message);
      setUiTick((tick) => tick + 1);
    }

    function render() {
      const game = gameRef.current;

      if (!game.gameOver) {
        for (let step = 0; step < PHYSICS_STEPS; step += 1) {
          simulate(game);
        }

        if (game.shotActive && allStopped(game.balls)) {
          gameRef.current = settleShot(game);
          syncUi(gameRef.current.message || `Player ${gameRef.current.currentPlayer}'s turn.`);
        }
      }

      drawPoolTable(ctx);
      gameRef.current.balls.forEach((ball) => drawBall(ctx, ball));
      drawCueAndAim(ctx, gameRef.current.balls[0], aimRef.current);

      if (audioUnlockedRef.current && gameRef.current.soundEvents.length > 0) {
        const events = gameRef.current.soundEvents.splice(0, 3);
        events.forEach((event) => playPoolSound(event));
      } else {
        gameRef.current.soundEvents.length = 0;
      }

      animationRef.current = requestAnimationFrame(render);
    }

    function onPointerDown(event: PointerEvent) {
      const game = gameRef.current;
      const cue = game.balls[0];
      if (game.gameOver) return;
      if (!allStopped(game.balls) || game.shotActive || cue.pocketed) return;
      audioUnlockedRef.current = true;

      const point = pointerToCanvas(event, canvasEl);
      const distance = Math.hypot(point.x - cue.x, point.y - cue.y);
      if (distance > BALL_RADIUS * 3) {
        setStatus("Start your drag on the cue ball.");
        return;
      }

      canvasEl.setPointerCapture(event.pointerId);
      aimRef.current = {
        active: true,
        startX: point.x,
        startY: point.y,
        currentX: point.x,
        currentY: point.y,
      };
      setStatus("Pull the cue stick back, aim, then release.");
      setPowerLabel("0%");
    }

    function onPointerMove(event: PointerEvent) {
      if (!aimRef.current.active) return;
      const point = pointerToCanvas(event, canvasEl);
      aimRef.current.currentX = point.x;
      aimRef.current.currentY = point.y;
      const pull = Math.hypot(point.x - aimRef.current.startX, point.y - aimRef.current.startY);
      setPowerLabel(`${Math.round(clamp(pull / 165, 0, 1) * 100)}%`);
    }

    function shoot(event: PointerEvent) {
      if (!aimRef.current.active) return;
      const point = pointerToCanvas(event, canvasEl);
      aimRef.current.currentX = point.x;
      aimRef.current.currentY = point.y;

      const game = gameRef.current;
      const cue = game.balls[0];
      const dx = aimRef.current.currentX - aimRef.current.startX;
      const dy = aimRef.current.currentY - aimRef.current.startY;
      const pull = Math.hypot(dx, dy);
      const power = clamp(pull / 165, 0, 1);

      if (pull >= 6) {
        cue.vx = (-dx / pull) * power * MAX_SHOT_SPEED;
        cue.vy = (-dy / pull) * power * MAX_SHOT_SPEED;
        game.shotActive = true;
        game.shotPocketed = [];
        game.cueScratch = false;
        game.soundEvents.push("shot");
        syncUi(`Player ${game.currentPlayer} shoots.`);
      } else {
        setStatus("Shot canceled. Drag farther for power.");
      }

      aimRef.current.active = false;
      setPowerLabel("0%");
      if (canvasEl.hasPointerCapture(event.pointerId)) {
        canvasEl.releasePointerCapture(event.pointerId);
      }
    }

    canvasEl.addEventListener("pointerdown", onPointerDown);
    canvasEl.addEventListener("pointermove", onPointerMove);
    canvasEl.addEventListener("pointerup", shoot);
    canvasEl.addEventListener("pointercancel", shoot);
    animationRef.current = requestAnimationFrame(render);

    return () => {
      canvasEl.removeEventListener("pointerdown", onPointerDown);
      canvasEl.removeEventListener("pointermove", onPointerMove);
      canvasEl.removeEventListener("pointerup", shoot);
      canvasEl.removeEventListener("pointercancel", shoot);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const game = gameRef.current;
  const solidsLeft = game.balls.filter((ball) => ball.group === "solid" && !ball.pocketed).length;
  const stripesLeft = game.balls.filter((ball) => ball.group === "stripe" && !ball.pocketed).length;

  function resetGame() {
    gameRef.current = makeInitialGame();
    aimRef.current.active = false;
    setStatus("Player 1 breaks. Drag from the cue ball and release to shoot.");
    setPowerLabel("0%");
    setUiTick((tick) => tick + 1);
  }

  return (
    <main className="min-h-screen bg-[#050607] px-4 py-6 text-white sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-6xl flex-col gap-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">8-Ball Pool</h1>
            <p className="mt-1 text-sm text-emerald-100/70">{status}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm">
              Turn <span className="font-semibold text-cyan-200">Player {game.currentPlayer}</span>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm">
              Power <span className="font-semibold text-cyan-200">{powerLabel}</span>
            </div>
            <button
              type="button"
              onClick={resetGame}
              className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-semibold transition hover:bg-white/10"
            >
              Reset
            </button>
          </div>
        </header>

        <section className="rounded-2xl border border-white/10 bg-[#090b0c] p-3 shadow-2xl">
          <canvas
            ref={canvasRef}
            width={TABLE.width}
            height={TABLE.height}
            className="block aspect-[16/9] w-full touch-none rounded-xl"
            aria-label="8-ball pool table. Drag from the cue ball to aim, release to shoot."
          />
        </section>

        <section className="grid gap-3 text-sm text-emerald-100/75 sm:grid-cols-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="text-xs uppercase tracking-wide text-white/40">Player 1</div>
            <div className="mt-1 font-semibold capitalize">{game.groups[1] ?? "Open table"}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="text-xs uppercase tracking-wide text-white/40">Player 2</div>
            <div className="mt-1 font-semibold capitalize">{game.groups[2] ?? "Open table"}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="text-xs uppercase tracking-wide text-white/40">Balls left</div>
            <div className="mt-1 font-semibold">Solids {solidsLeft} · Stripes {stripesLeft}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="text-xs uppercase tracking-wide text-white/40">8-ball</div>
            <div className="mt-1 font-semibold">
              {game.gameOver ? `Player ${game.winner} wins` : "Clear your group first"}
            </div>
          </div>
        </section>
        <p className="text-xs text-emerald-100/45">
          Spin is intentionally left for the next physics pass; the cue and rule system are ready for that control.
        </p>
      </div>
    </main>
  );
}
