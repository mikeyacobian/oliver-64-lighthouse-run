import { useCallback, useEffect, useRef, useState } from "react";
import { HUD } from "./components/HUD";
import { Game } from "./game/Game";
import type { Difficulty, HudState } from "./game/types";

const initialHud: HudState = {
  score: 0,
  stars: 0,
  totalStars: 5,
  lives: 3,
  timeLeft: 180,
  zoomFuel: 1,
  barkReady: true,
  ringReady: false,
  difficulty: "normal",
  message: "Collect 5 Nantucket Stars, then reach the lighthouse ring.",
  mode: "ready",
};

export default function App() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Game | null>(null);
  const [hud, setHud] = useState<HudState>(initialHud);

  useEffect(() => {
    if (!hostRef.current) return;

    const game = new Game(hostRef.current, setHud);
    gameRef.current = game;
    game.start();

    return () => {
      game.dispose();
      gameRef.current = null;
    };
  }, []);

  const restart = useCallback(() => {
    gameRef.current?.restart();
  }, []);

  const startRun = useCallback(() => {
    gameRef.current?.startRun();
  }, []);

  const changeDifficulty = useCallback((difficulty: Difficulty) => {
    gameRef.current?.setDifficulty(difficulty);
  }, []);

  return (
    <main className="app">
      <div ref={hostRef} className="game-host" aria-label="Oliver 64 game canvas" />
      <HUD state={hud} onRestart={restart} onStart={startRun} onDifficultyChange={changeDifficulty} />
    </main>
  );
}
