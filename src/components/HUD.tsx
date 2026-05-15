import type { HudState } from "../game/types";

type HUDProps = {
  state: HudState;
  onRestart: () => void;
  onStart: () => void;
};

export function HUD({ state, onRestart, onStart }: HUDProps) {
  const time = Math.max(0, Math.ceil(state.timeLeft));
  const zoomPercent = Math.round(state.zoomFuel * 100);

  return (
    <section className="hud" aria-live="polite">
      <div className="hud__top">
        <div className="hud__brand">
          <span className="hud__title">Oliver 64</span>
          <span className="hud__subtitle">Lighthouse Run</span>
        </div>
        <button className="hud__restart" type="button" onClick={onRestart}>
          Restart
        </button>
      </div>

      <div className="hud__stats">
        <Stat label="Score" value={state.score.toString()} />
        <Stat label="Stars" value={`${state.stars}/${state.totalStars}`} />
        <Stat label="Lives" value={state.lives.toString()} />
        <Stat label="Timer" value={`${time}s`} />
      </div>

      <div className="hud__fuel" aria-label={`Zoom fuel ${zoomPercent}%`}>
        <span>Zoom Fuel</span>
        <div className="hud__fuelTrack">
          <div className="hud__fuelFill" style={{ width: `${zoomPercent}%` }} />
        </div>
      </div>

      <div className="hud__readiness">
        <Status label="Bark" active={state.barkReady} activeText="Ready" inactiveText="Cooling" />
        <Status label="Ring" active={state.ringReady} activeText="Glowing" inactiveText="Dim" />
      </div>

      <p className={`hud__message hud__message--${state.mode}`}>{state.message}</p>

      {state.mode === "ready" && (
        <div className="hud__overlay">
          <div className="hud__result hud__result--wide">
            <h1>Oliver 64: Lighthouse Run</h1>
            <p>Collect 5 Nantucket Stars, bark at gulls, then sprint for the glowing lighthouse ring.</p>
            <div className="hud__controls">
              <span>WASD / Arrows: move</span>
              <span>Space: jump</span>
              <span>B: bark</span>
              <span>Shift / Z: zoomies</span>
            </div>
            <button type="button" onClick={onStart}>
              Start Run
            </button>
          </div>
        </div>
      )}

      {(state.mode === "won" || state.mode === "lost") && (
        <div className="hud__overlay">
          <div className="hud__result">
            <h1>{state.mode === "won" ? "Lighthouse Saved!" : "Sunset Caught Oliver"}</h1>
            <p>{state.message}</p>
            <button type="button" onClick={onRestart}>
              Run Again
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Status({
  label,
  active,
  activeText,
  inactiveText,
}: {
  label: string;
  active: boolean;
  activeText: string;
  inactiveText: string;
}) {
  return (
    <div className={`hud__status ${active ? "hud__status--active" : ""}`}>
      <span>{label}</span>
      <strong>{active ? activeText : inactiveText}</strong>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="hud__stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
