"use client";

import { useEffect, useState } from "react";

export default function GTVIntro() {
  const [exiting, setExiting] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const exitTimer = window.setTimeout(() => {
      setExiting(true);
    }, 3600);

    const hideTimer = window.setTimeout(() => {
      setVisible(false);
    }, 4000);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`gtv-cinematic-intro ${exiting ? "gtv-intro-leave" : ""}`}
      role="status"
      aria-label="Welcome to GTrustVault"
    >
      <div className="gtv-background-grid" />
      <div className="gtv-energy-beam gtv-beam-one" />
      <div className="gtv-energy-beam gtv-beam-two" />
      <div className="gtv-core-flash" aria-hidden="true" />
      <div className="gtv-scan-line" aria-hidden="true" />
      <div className="gtv-vignette" aria-hidden="true" />
      <div className="gtv-hud gtv-hud-top-left"><span>GTV / SECURE CORE</span><i>SYS.01</i></div>
      <div className="gtv-hud gtv-hud-top-right"><span>ENCRYPTION</span><i>ACTIVE</i></div>
      <div className="gtv-hud gtv-hud-bottom-left"><span>IDENTITY VERIFIED</span><i>256-BIT</i></div>
      <div className="gtv-hud gtv-hud-bottom-right"><span>SECURE ACCESS</span><i>READY</i></div>
      <div className="gtv-orbit-pulse" aria-hidden="true" />

      {Array.from({ length: 32 }, (_, index) => (
        <span
          key={index}
          className="gtv-particle"
          style={{
            left: `${(index * 37 + 11) % 100}%`,
            top: `${(index * 61 + 7) % 100}%`,
            animationDelay: `${(index % 8) * -0.35}s`,
            animationDuration: `${2.5 + (index % 5) * 0.6}s`,
          }}
        />
      ))}

      <div className="gtv-crimson-rain" aria-hidden="true">
          {Array.from({ length: 26 }, (_, i) => (
            <span key={i} style={{
              "--ray-index": i,
              "--ray-left": `${(i * 37 + 7) % 100}%`,
              "--ray-delay": `${-((i * 17) % 43) / 10}s`,
              "--ray-height": `${90 + ((i * 29) % 170)}px`,
            } as React.CSSProperties} />
          ))}
        </div>
      <div className="gtv-shield-halo" aria-hidden="true">
          <div className="gtv-fire-crown">
            {Array.from({ length: 18 }, (_, i) => (
              <span key={i} style={{ "--flame-index": i } as React.CSSProperties} />
            ))}
          </div>
          <span className="gtv-frame-corner gtv-frame-tl" />
          <span className="gtv-frame-corner gtv-frame-tr" />
          <span className="gtv-frame-corner gtv-frame-bl" />
          <span className="gtv-frame-corner gtv-frame-br" />
          <span className="gtv-frame-line gtv-frame-line-x" />
          <span className="gtv-frame-line gtv-frame-line-y" />
          <span className="gtv-halo-arc gtv-halo-arc-one" />
          <span className="gtv-halo-arc gtv-halo-arc-two" />
          <span className="gtv-halo-arc gtv-halo-arc-three" />
          <span className="gtv-halo-node gtv-halo-node-one" />
          <span className="gtv-halo-node gtv-halo-node-two" />
          <span className="gtv-halo-node gtv-halo-node-three" />
          <span className="gtv-halo-node gtv-halo-node-four" />
          <span className="gtv-energy-spark gtv-spark-one" />
          <span className="gtv-energy-spark gtv-spark-two" />
          <span className="gtv-energy-spark gtv-spark-three" />
          <span className="gtv-energy-spark gtv-spark-four" />
        </div>
        <div className="gtv-intro-scene">
        <div className="gtv-hologram-ring gtv-hologram-ring-one" />
        <div className="gtv-hologram-ring gtv-hologram-ring-two" />
        <div className="gtv-hologram-ring gtv-hologram-ring-three" />

        <div className="gtv-vault-doors" aria-hidden="true">
          <span className="gtv-vault-door gtv-vault-door-left">
            <i className="gtv-door-rib gtv-door-rib-a" />
            <i className="gtv-door-rib gtv-door-rib-b" />
            <i className="gtv-door-handle" />
          </span>
          <span className="gtv-vault-door gtv-vault-door-right">
            <i className="gtv-door-rib gtv-door-rib-a" />
            <i className="gtv-door-rib gtv-door-rib-b" />
            <i className="gtv-door-handle" />
          </span>
        </div>
      <div className="gtv-volley" aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => (
            <span
              key={i}
              style={{
                "--shot-index": i,
                "--shot-y": `${22 + ((i * 17) % 57)}%`,
                "--shot-delay": `${1.45 + (i % 4) * 0.09}s`,
                "--shot-angle": `${-12 + ((i * 11) % 25)}deg`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      <div className="gtv-logo-stage">
          <div className="gtv-logo-aura" />

          <div className="gtv-shield-frame">
            <svg
              viewBox="0 0 100 115"
              className="gtv-shield-svg"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="gtvShieldGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#a8f1ff" />
                  <stop offset="50%" stopColor="#168dff" />
                  <stop offset="100%" stopColor="#765bff" />
                </linearGradient>
              </defs>
              <path
                d="M50 5 L91 22 L86 67 Q77 91 50 108 Q23 91 14 67 L9 22 Z"
                fill="rgba(0,130,255,0.09)"
                stroke="url(#gtvShieldGradient)"
                strokeWidth="2.5"
              />
              <path
                d="M50 14 L82 27 L78 64 Q70 84 50 96 Q30 84 22 64 L18 27 Z"
                fill="none"
                stroke="#43caff"
                strokeWidth="0.8"
                opacity="0.65"
              />
            </svg>

            <div className="gtv-monogram">
              <span>G</span>
              <span>T</span>
              <span className="gtv-letter-v">V</span>
            </div>

            <div className="gtv-lock">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path d="M8 10 V7a4 4 0 0 1 8 0v3" />
                <path d="M12 14v3" />
              </svg>
            </div>
          </div>

          <div className="gtv-logo-reflection" />
        </div>

        <div className="gtv-brand-reveal">
          <div className="gtv-brand-name">
            <span>GTrust</span>
            <span className="gtv-brand-vault">Vault</span>
          </div>

          <p className="gtv-tagline">SECURE. PROTECT. SHARE.</p>

          <div className="gtv-loading-line">
            <span />
          </div>

          <div className="gtv-system-status">
            <span className="gtv-status-dot" />
            SECURE ENVIRONMENT INITIALIZING
          </div>
        </div>

        <div className="gtv-floor-platform">
          <div />
          <div />
          <div />
        </div>
      </div>

      <style jsx global>{`
        .gtv-cinematic-intro {
          position: fixed;
          inset: 0;
          z-index: 99999;
          display: grid;
          place-items: center;
          overflow: hidden;
          background:
            radial-gradient(ellipse at 50% 38%, rgba(0, 115, 255, 0.30), transparent 32%),
            radial-gradient(ellipse at 18% 78%, rgba(92, 42, 255, 0.16), transparent 36%),
            radial-gradient(ellipse at 84% 18%, rgba(0, 215, 255, 0.13), transparent 30%),
            radial-gradient(ellipse at 50% 100%, rgba(0, 108, 255, 0.16), transparent 55%),
            #01030a;
          color: white;
          opacity: 1;
          visibility: visible;
          transition: opacity 700ms ease, visibility 700ms ease;
        }

        .gtv-intro-leave {
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
        }

        .gtv-background-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(30, 137, 255, 0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(30, 137, 255, 0.07) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse at center, black 10%, transparent 78%);
          animation: gtv-grid-drift 12s linear infinite;
        }

        .gtv-vignette {
          position: absolute;
          inset: 0;
          z-index: 4;
          pointer-events: none;
          background: radial-gradient(ellipse at center, transparent 35%, rgba(0, 0, 0, 0.5) 100%);
        }

        .gtv-hud {
          position: absolute;
          z-index: 5;
          display: flex;
          flex-direction: column;
          gap: 5px;
          color: rgba(119, 206, 255, 0.62);
          font: 600 9px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
          letter-spacing: 0.18em;
          text-shadow: 0 0 12px rgba(0, 151, 255, 0.55);
          opacity: 0;
          animation: gtv-hud-reveal 500ms ease 1.4s forwards;
        }

        .gtv-hud i {
          color: rgba(113, 255, 220, 0.86);
          font-style: normal;
          font-size: 8px;
          letter-spacing: 0.24em;
        }

        .gtv-hud-top-left { top: 28px; left: 30px; }
        .gtv-hud-top-right { top: 28px; right: 30px; text-align: right; }
        .gtv-hud-bottom-left { bottom: 28px; left: 30px; }
        .gtv-hud-bottom-right { bottom: 28px; right: 30px; text-align: right; }

        .gtv-orbit-pulse {
          position: absolute;
          z-index: 0;
          left: 50%;
          top: 43%;
          width: min(82vw, 650px);
          aspect-ratio: 1;
          border: 1px solid rgba(36, 164, 255, 0.1);
          border-radius: 50%;
          box-shadow: 0 0 60px rgba(0, 114, 255, 0.08), inset 0 0 60px rgba(0, 114, 255, 0.06);
          transform: translate(-50%, -50%) scale(0.72);
          animation: gtv-orbit-breathe 4s ease-in-out infinite alternate;
          pointer-events: none;
        }

        .gtv-core-flash {
          position: absolute;
          z-index: 1;
          left: 50%;
          top: 43%;
          width: min(70vw, 520px);
          aspect-ratio: 1;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(135, 232, 255, 0.42) 0%, rgba(24, 133, 255, 0.16) 24%, transparent 68%);
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.2);
          pointer-events: none;
          animation: gtv-core-flash 1.4s ease-out 2.55s both;
        }

        .gtv-scan-line {
          position: absolute;
          z-index: 3;
          left: 0;
          right: 0;
          top: 0;
          height: 2px;
          opacity: 0;
          background: linear-gradient(90deg, transparent, rgba(95, 226, 255, 0.95), transparent);
          box-shadow: 0 0 22px rgba(42, 181, 255, 0.8);
          animation: gtv-scan 2.1s ease-in-out 0.4s both;
          pointer-events: none;
        }

        .gtv-energy-beam {
          position: absolute;
          width: 1px;
          height: 70vh;
          background: linear-gradient(transparent, #21caff, transparent);
          opacity: 0;
          filter: drop-shadow(0 0 8px #168dff);
          animation: gtv-beam-flash 2.8s ease-in-out infinite;
        }

        .gtv-beam-one {
          left: 18%;
          transform: rotate(25deg);
        }

        .gtv-beam-two {
          right: 18%;
          transform: rotate(-25deg);
          animation-delay: 0.8s;
        }

        .gtv-particle {
          position: absolute;
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: #67ddff;
          box-shadow: 0 0 10px 2px rgba(0, 159, 255, 0.7);
          opacity: 0;
          animation: gtv-particle-float 3s ease-in-out infinite;
        }

        .gtv-intro-scene {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: min(94vw, 760px);
          min-height: min(90vh, 700px);
          perspective: 1000px;
          animation: gtv-scene-entrance 1.1s cubic-bezier(.16, 1, .3, 1) both;
        }

        .gtv-shield-halo {
          position: absolute;
          z-index: 0;
          left: 50%;
          top: 42%;
          width: min(94vw, 760px);
          aspect-ratio: 1;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          pointer-events: none;
          background:
            radial-gradient(circle, rgba(17, 122, 255, 0.16) 0 18%, transparent 46%),
            conic-gradient(from 0deg, transparent 0 7%, rgba(52, 199, 255, 0.85) 8%, transparent 10% 22%, rgba(126, 90, 255, 0.7) 24%, transparent 26% 48%, rgba(52, 199, 255, 0.8) 50%, transparent 53% 76%, rgba(126, 90, 255, 0.7) 78%, transparent 81%);
          mask-image: radial-gradient(circle, transparent 0 43%, black 44% 44.5%, transparent 45% 51%, black 52% 52.5%, transparent 53% 60%, black 61% 61.5%, transparent 62%);
          filter: drop-shadow(0 0 18px rgba(0, 160, 255, 0.45));
          animation: gtv-shield-orbit 18s linear infinite;
        }

        /* Ember-fire halo and precision sci-fi frame surrounding the unchanged logo */
        .gtv-fire-crown {
          position: absolute;
          inset: 7% 9%;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(.25px);
          animation: gtv-fire-breathe 1.9s ease-in-out infinite alternate;
        }
        .gtv-fire-crown span {
          position: absolute;
          left: calc(50% - 3px);
          top: 50%;
          width: 6px;
          height: clamp(30px, 5.2vw, 62px);
          border-radius: 90% 8% 75% 12%;
          transform-origin: 50% 100%;
          transform: rotate(calc(var(--flame-index) * 20deg)) translateY(calc(clamp(30px, 5.2vw, 62px) * -1));
          background: linear-gradient(to top, rgba(255,70,20,0), rgba(255,86,30,.28) 22%, rgba(255,174,64,.95) 68%, rgba(255,235,174,.95));
          box-shadow: 0 0 10px rgba(255,92,28,.5), 0 0 24px rgba(255,63,19,.25);
          opacity: .62;
          animation: gtv-flame-flicker calc(.7s + (var(--flame-index) % 5) * .16s) ease-in-out infinite alternate;
          animation-delay: calc(var(--flame-index) * -.11s);
        }
        .gtv-frame-corner {
          position: absolute;
          width: clamp(42px, 8vw, 94px);
          height: clamp(42px, 8vw, 94px);
          border-color: rgba(255, 65, 92, .96);
          filter: drop-shadow(0 0 8px rgba(255, 35, 76, .9));
          animation: gtv-frame-glow 2.4s ease-in-out infinite alternate;
        }
        .gtv-frame-tl { top: 5%; left: 7%; border-top: 2px solid; border-left: 2px solid; clip-path: polygon(0 0,100% 0,100% 12%,14% 12%,14% 100%,0 100%); }
        .gtv-frame-tr { top: 5%; right: 7%; border-top: 2px solid; border-right: 2px solid; clip-path: polygon(0 0,100% 0,100% 100%,86% 100%,86% 12%,0 12%); }
        .gtv-frame-bl { bottom: 5%; left: 7%; border-bottom: 2px solid; border-left: 2px solid; clip-path: polygon(0 0,14% 0,14% 86%,100% 86%,100% 100%,0 100%); }
        .gtv-frame-br { bottom: 5%; right: 7%; border-bottom: 2px solid; border-right: 2px solid; clip-path: polygon(86% 0,100% 0,100% 100%,0 100%,0 86%,86% 86%); }
        .gtv-frame-line {
          position: absolute;
          opacity: .7;
          background: linear-gradient(90deg, transparent, rgba(255,55,88,.82), transparent);
          box-shadow: 0 0 12px rgba(255,45,80,.58);
        }
        .gtv-frame-line-x { left: 18%; right: 18%; height: 1px; top: 12%; animation: gtv-frame-scan-x 3.2s ease-in-out infinite; }
        .gtv-frame-line-y { top: 18%; bottom: 18%; width: 1px; left: 12%; background: linear-gradient(180deg, transparent, rgba(255,55,88,.82), transparent); animation: gtv-frame-scan-y 3.8s ease-in-out infinite; }
        .gtv-energy-spark {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #fff2bf;
          box-shadow: 0 0 7px 3px rgba(255,111,31,.85), 0 0 20px 7px rgba(255,65,20,.38);
          animation: gtv-spark-dash 2.8s linear infinite;
        }
        .gtv-spark-one { top: 15%; left: 25%; }
        .gtv-spark-two { top: 24%; right: 15%; animation-delay: -.7s; }
        .gtv-spark-three { bottom: 15%; left: 20%; animation-delay: -1.4s; }
        .gtv-spark-four { bottom: 23%; right: 22%; animation-delay: -2.1s; }

        /* Cinematic crimson rain + heavy vault doors */
        .gtv-crimson-rain {
          position: absolute;
          inset: 0;
          z-index: 1;
          overflow: hidden;
          pointer-events: none;
          opacity: .92;
          -webkit-mask-image: radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,.25) 28%, #000 78%);
          mask-image: radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,.25) 28%, #000 78%);
        }
        .gtv-crimson-rain span {
          position: absolute;
          left: var(--ray-left);
          top: -25%;
          width: 2px;
          height: var(--ray-height);
          background: linear-gradient(to bottom, transparent, rgba(88,0,13,.05) 8%, rgba(104,0,18,.76) 48%, rgba(178,12,35,.95) 74%, rgba(70,0,9,0));
          box-shadow: 0 0 9px rgba(105,0,20,.55), 0 0 20px rgba(82,0,16,.28);
          opacity: .18;
          animation: gtv-crimson-fall calc(2.1s + (var(--ray-index) % 6) * .31s) linear infinite;
          animation-delay: var(--ray-delay);
        }
        .gtv-vault-doors {
          position: absolute;
          z-index: 2;
          width: 100vw;
          height: 100vh;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          perspective: 1200px;
          pointer-events: none;
          display: flex;
          overflow: visible;
          opacity: .9;
          filter: drop-shadow(0 0 22px rgba(86,0,14,.42));
        }
        /* Stylized non-graphic red energy volley between vault reveals */
        .gtv-volley {
          position: absolute;
          z-index: 6;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }
        .gtv-volley span {
          position: absolute;
          left: -18%;
          top: var(--shot-y);
          width: clamp(72px, 13vw, 190px);
          height: 2px;
          border-radius: 999px;
          opacity: 0;
          background: linear-gradient(90deg, transparent, rgba(255,30,58,.25) 18%, #ff344f 70%, #fff1f3 94%, transparent);
          box-shadow: 0 0 7px rgba(255,20,48,.95), 0 0 18px rgba(150,0,20,.8);
          animation: gtv-energy-shot .42s cubic-bezier(.15,.7,.3,1) var(--shot-delay) both;
        }
        .gtv-volley span:nth-child(even) {
          left: auto;
          right: -18%;
          background: linear-gradient(270deg, transparent, rgba(255,30,58,.25) 18%, #ff344f 70%, #fff1f3 94%, transparent);
          animation-name: gtv-energy-shot-reverse;
        }
        @keyframes gtv-energy-shot {
          0% { opacity: 0; transform: translateX(0) rotate(var(--shot-angle)) scaleX(.25); }
          15% { opacity: 1; }
          100% { opacity: 0; transform: translateX(120vw) rotate(var(--shot-angle)) scaleX(1.15); }
        }
        @keyframes gtv-energy-shot-reverse {
          0% { opacity: 0; transform: translateX(0) rotate(var(--shot-angle)) scaleX(.25); }
          15% { opacity: 1; }
          100% { opacity: 0; transform: translateX(-120vw) rotate(var(--shot-angle)) scaleX(1.15); }
        }
        .gtv-vault-door {
          position: relative;
          width: 50%;
          height: 100%;
          display: block;
          overflow: hidden;
          border: 1px solid rgba(155, 14, 39, .7);
          background:
            repeating-linear-gradient(90deg, transparent 0 26px, rgba(255,70,90,.06) 27px 29px, transparent 30px 53px),
            linear-gradient(145deg, rgba(42,3,11,.97), rgba(10,7,14,.98) 48%, rgba(57,3,15,.98));
          box-shadow: inset 0 0 45px rgba(155,0,27,.25), inset 0 0 8px rgba(255,68,95,.22);
          transform-style: preserve-3d;
          animation: gtv-vault-open 1.35s cubic-bezier(.55,.05,.25,1) .2s forwards;
        }
        .gtv-vault-door-left {
          transform-origin: left center;
          border-right: 2px solid rgba(190,25,55,.88);
          background-image:
            linear-gradient(90deg, rgba(255,60,85,.12), transparent 18%, transparent 78%, rgba(255,60,85,.1)),
            repeating-linear-gradient(90deg, transparent 0 26px, rgba(255,70,90,.06) 27px 29px, transparent 30px 53px),
            linear-gradient(145deg, rgba(42,3,11,.98), rgba(10,7,14,.99) 48%, rgba(57,3,15,.98));
        }
        .gtv-vault-door-right {
          transform-origin: right center;
          border-left: 2px solid rgba(190,25,55,.88);
          animation-name: gtv-vault-open-right;
          animation-duration: 1.35s;
          animation-delay: .2s;
          background-image:
            linear-gradient(270deg, rgba(255,60,85,.12), transparent 18%, transparent 78%, rgba(255,60,85,.1)),
            repeating-linear-gradient(90deg, transparent 0 26px, rgba(255,70,90,.06) 27px 29px, transparent 30px 53px),
            linear-gradient(215deg, rgba(42,3,11,.98), rgba(10,7,14,.99) 48%, rgba(57,3,15,.98));
        }
        .gtv-door-rib {
          position: absolute;
          top: 8%;
          bottom: 8%;
          width: 10px;
          border: 1px solid rgba(255,70,96,.24);
          background: linear-gradient(90deg, rgba(5,3,8,.95), rgba(150,12,38,.65), rgba(7,4,9,.95));
          box-shadow: 0 0 12px rgba(118,0,22,.22);
        }
        .gtv-door-rib-a { left: 12%; }
        .gtv-door-rib-b { right: 12%; }
        .gtv-door-handle {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 20px;
          height: 76px;
          transform: translate(-50%,-50%);
          border-radius: 10px;
          border: 1px solid rgba(255,80,105,.55);
          background: linear-gradient(90deg, #16050a, #8f102c, #21050d);
          box-shadow: 0 0 15px rgba(128,0,24,.45), inset 0 0 8px rgba(255,90,120,.3);
        }
        .gtv-cinematic-intro.gtv-intro-leave .gtv-vault-door {
          animation-duration: .5s;
        }
        @keyframes gtv-crimson-fall {
          0% { transform: translateY(-10%); opacity: 0; }
          12% { opacity: .2; }
          65% { opacity: .9; }
          100% { transform: translateY(145vh); opacity: 0; }
        }
        @keyframes gtv-vault-open {
          0% { transform: rotateY(0deg); opacity: 1; }
          70% { opacity: .96; }
          100% { transform: rotateY(-104deg); opacity: .12; }
        }
        @keyframes gtv-vault-open-right {
          0% { transform: rotateY(0deg); opacity: 1; }
          70% { opacity: .96; }
          100% { transform: rotateY(104deg); opacity: .12; }
        }
        @media (max-width: 640px) {
          .gtv-vault-doors { width: 100vw; height: 100vh; }
          .gtv-door-rib { width: 5px; }
          .gtv-door-handle { width: 12px; height: 54px; }
        }

        /* Premium crimson shield + violet orbital rings */
        .gtv-shield-halo .gtv-halo-arc-one {
          border-color: rgba(192, 132, 252, .95);
          box-shadow: 0 0 10px rgba(168, 85, 247, .72), inset 0 0 10px rgba(168, 85, 247, .22);
        }
        .gtv-shield-halo .gtv-halo-arc-two {
          border-color: rgba(168, 85, 247, .85);
          box-shadow: 0 0 15px rgba(147, 51, 234, .62);
        }
        .gtv-shield-halo .gtv-halo-arc-three {
          border-color: rgba(216, 180, 254, .72);
          box-shadow: 0 0 12px rgba(168, 85, 247, .55);
        }
        .gtv-shield-halo .gtv-halo-node {
          background: #d8b4fe;
          box-shadow: 0 0 8px 3px rgba(168, 85, 247, .75), 0 0 22px rgba(147, 51, 234, .6);
        }

        .gtv-halo-arc {
          position: absolute;
          inset: 12%;
          border: 1px solid rgba(70, 213, 255, 0.25);
          border-radius: 50%;
          transform: rotateX(68deg) rotateZ(0deg);
          box-shadow: 0 0 18px rgba(0, 150, 255, 0.1);
        }

        .gtv-halo-arc-one { animation: gtv-halo-spin 7s linear infinite; }
        .gtv-halo-arc-two {
          inset: 20%;
          border-color: rgba(146, 111, 255, 0.35);
          transform: rotateX(68deg) rotateZ(60deg);
          animation: gtv-halo-spin-reverse 9s linear infinite;
        }
        .gtv-halo-arc-three {
          inset: 28%;
          border-color: rgba(70, 213, 255, 0.28);
          transform: rotateX(68deg) rotateZ(-45deg);
          animation: gtv-halo-spin 12s linear infinite;
        }

        .gtv-halo-node {
          position: absolute;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #b8f5ff;
          box-shadow: 0 0 8px 3px #168dff, 0 0 24px 6px rgba(0, 170, 255, 0.55);
          animation: gtv-node-pulse 1.6s ease-in-out infinite alternate;
        }
        .gtv-halo-node-one { left: 17%; top: 28%; }
        .gtv-halo-node-two { right: 15%; top: 37%; animation-delay: .4s; }
        .gtv-halo-node-three { left: 28%; bottom: 14%; animation-delay: .8s; }
        .gtv-halo-node-four { right: 27%; bottom: 19%; animation-delay: 1.2s; }

        .gtv-hologram-ring {
          position: absolute;
          top: 30%;
          left: 50%;
          width: min(94vw, 820px);
          aspect-ratio: 2.3 / 1;
          border: 1px solid rgba(30, 183, 255, 0.7);
          border-radius: 50%;
          box-shadow:
            0 0 12px rgba(0, 159, 255, 0.3),
            inset 0 0 12px rgba(0, 159, 255, 0.16);
          pointer-events: none;
        }

        .gtv-hologram-ring-one {
          animation: gtv-ring-spin 4s linear infinite;
        }

        .gtv-hologram-ring-two {
          border-color: rgba(119, 93, 255, 0.65);
          transform: translateX(-50%) rotateX(67deg) rotateZ(58deg);
          animation: gtv-ring-reverse 5s linear infinite;
        }

        .gtv-hologram-ring-three {
          width: min(78vw, 660px);
          border-color: rgba(93, 222, 255, 0.45);
          transform: translateX(-50%) rotateX(72deg) rotateZ(-35deg);
          animation: gtv-ring-spin 7s linear infinite;
        }

        .gtv-logo-stage {
          position: relative;
          display: grid;
          place-items: center;
          width: 340px;
          height: 330px;
          margin-top: -8px;
          transform: scale(0.38);
          transform-style: preserve-3d;
          animation: gtv-logo-cinematic 5.2s cubic-bezier(.16, 1, .3, 1) both;
        }

        .gtv-logo-aura {
          position: absolute;
          width: 340px;
          height: 340px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(42, 190, 255, 0.42), rgba(70, 70, 255, 0.16) 48%, transparent 72%);
          filter: blur(36px);
          animation: gtv-aura-pulse 2s ease-in-out infinite alternate;
        }

        .gtv-shield-frame {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 220px;
          height: 253px;
          filter: drop-shadow(0 0 24px rgba(0, 157, 255, 0.78)) drop-shadow(0 0 48px rgba(87, 86, 255, 0.28));
        }

        .gtv-shield-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        /* Futuristic vault doors that open over the GTV shield */
        .gtv-shield-frame::before,
        .gtv-shield-frame::after {
          content: "";
          position: absolute;
          z-index: 5;
          top: 15%;
          width: 50%;
          height: 70%;
          border: 1px solid rgba(103, 221, 255, 0.9);
          background:
            linear-gradient(135deg, rgba(12, 35, 70, 0.98), rgba(4, 11, 28, 0.98)),
            #071326;
          box-shadow: inset 0 0 18px rgba(0, 157, 255, 0.28), 0 0 12px rgba(0, 157, 255, 0.22);
          backface-visibility: hidden;
          animation: gtv-vault-door-open .85s cubic-bezier(.16, 1, .3, 1) 2.45s forwards;
        }

        .gtv-shield-frame::before {
          left: 0;
          transform-origin: left center;
          border-radius: 16px 3px 3px 16px;
          background-image:
            linear-gradient(90deg, transparent 78%, rgba(64, 211, 255, 0.65) 79%, transparent 82%),
            linear-gradient(135deg, rgba(12, 35, 70, 0.98), rgba(4, 11, 28, 0.98));
        }

        .gtv-shield-frame::after {
          right: 0;
          transform-origin: right center;
          border-radius: 3px 16px 16px 3px;
          animation-name: gtv-vault-door-open-right;
          animation-duration: .85s;
          animation-timing-function: cubic-bezier(.16, 1, .3, 1);
          animation-delay: 2.45s;
          animation-fill-mode: forwards;
          background-image:
            linear-gradient(270deg, transparent 78%, rgba(64, 211, 255, 0.65) 79%, transparent 82%),
            linear-gradient(135deg, rgba(12, 35, 70, 0.98), rgba(4, 11, 28, 0.98));
        }

        .gtv-monogram {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          margin-top: 8px;
          font-size: 61px;
          font-weight: 900;
          letter-spacing: -5px;
          line-height: 1;
          color: #effaff;
          text-shadow:
            0 0 6px #ffffff,
            0 0 18px #168dff,
            0 0 34px rgba(0, 174, 255, 0.85);
          transform: perspective(300px) rotateY(-8deg);
        }

        .gtv-letter-v {
          color: #49d9ff;
        }

        .gtv-lock {
          position: relative;
          width: 24px;
          height: 24px;
          margin-top: 8px;
          color: #47d9ff;
        }

        .gtv-lock svg {
          width: 100%;
          height: 100%;
          fill: rgba(0, 157, 255, 0.14);
          stroke: currentColor;
          stroke-width: 1.5;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .gtv-logo-reflection {
          position: absolute;
          bottom: 16px;
          width: 120px;
          height: 2px;
          background: #26caff;
          box-shadow: 0 0 24px 5px rgba(0, 174, 255, 0.65);
          animation: gtv-reflection-pulse 1.5s ease-in-out infinite alternate;
        }

        .gtv-brand-reveal {
          position: relative;
          z-index: 2;
          margin-top: -4px;
          text-align: center;
          animation: gtv-brand-entrance 1s 350ms ease both;
        }

        .gtv-brand-name {
          font-size: clamp(2.8rem, 8vw, 5.1rem);
          font-weight: 800;
          line-height: 1.08;
          letter-spacing: -0.055em;
          color: #f5faff;
          text-shadow: 0 0 22px rgba(0, 139, 255, 0.45);
        }

        .gtv-brand-vault {
          color: #38cfff;
          text-shadow:
            0 0 12px rgba(0, 187, 255, 0.7),
            0 0 32px rgba(0, 104, 255, 0.4);
        }

        .gtv-tagline {
          margin: 16px 0 0;
          color: #b9e8ff;
          font-size: clamp(0.65rem, 2vw, 0.9rem);
          font-weight: 600;
          letter-spacing: 0.38em;
          animation: gtv-tagline-glow 2s ease-in-out infinite alternate;
        }

        .gtv-loading-line {
          width: 180px;
          height: 2px;
          margin: 24px auto 0;
          overflow: hidden;
          background: rgba(82, 158, 255, 0.16);
          box-shadow: 0 0 12px rgba(0, 125, 255, 0.16);
        }

        .gtv-loading-line span {
          display: block;
          width: 45%;
          height: 100%;
          background: linear-gradient(90deg, transparent, #27cfff, #a8f5ff, transparent);
          box-shadow: 0 0 12px #13aaff;
          animation: gtv-loading-sweep 1.1s ease-in-out infinite;
        }

        .gtv-system-status {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 16px;
          color: rgba(157, 203, 238, 0.7);
          font-size: 9px;
          letter-spacing: 0.2em;
        }

        .gtv-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #2de5a4;
          box-shadow: 0 0 10px #2de5a4;
          animation: gtv-status-blink 1s ease-in-out infinite alternate;
        }

        .gtv-floor-platform {
          position: absolute;
          bottom: 1%;
          left: 50%;
          width: min(84vw, 600px);
          height: 65px;
          transform: translateX(-50%) perspective(300px) rotateX(65deg);
          border: 1px solid rgba(29, 170, 255, 0.5);
          border-radius: 50%;
          box-shadow:
            0 0 18px rgba(0, 148, 255, 0.22),
            inset 0 0 18px rgba(0, 148, 255, 0.2);
        }

        .gtv-floor-platform div {
          position: absolute;
          inset: 8px;
          border: 1px solid rgba(56, 191, 255, 0.32);
          border-radius: 50%;
        }

        .gtv-floor-platform div:nth-child(2) {
          inset: 16px 35px;
          border-color: rgba(124, 96, 255, 0.4);
        }

        .gtv-floor-platform div:nth-child(3) {
          inset: 24px 70px;
          border-color: rgba(40, 203, 255, 0.5);
        }

        @keyframes gtv-hud-reveal {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 0.95; transform: translateY(0); }
        }

        @keyframes gtv-orbit-breathe {
          from { opacity: 0.3; transform: translate(-50%, -50%) scale(0.72) rotate(0deg); }
          to { opacity: 0.85; transform: translate(-50%, -50%) scale(1.04) rotate(8deg); }
        }

        @keyframes gtv-fire-breathe {
          from { transform: scale(.96); opacity: .62; }
          to { transform: scale(1.045); opacity: 1; }
        }
        @keyframes gtv-flame-flicker {
          from { opacity: .28; filter: hue-rotate(-12deg); }
          to { opacity: .92; filter: hue-rotate(12deg); }
        }
        @keyframes gtv-frame-glow {
          from { opacity: .56; filter: drop-shadow(0 0 4px rgba(255,35,76,.55)); }
          to { opacity: 1; filter: drop-shadow(0 0 13px rgba(255,35,76,1)); }
        }
        @keyframes gtv-frame-scan-x {
          0%, 100% { transform: translateY(0); opacity: .18; }
          50% { transform: translateY(50px); opacity: .9; }
        }
        @keyframes gtv-frame-scan-y {
          0%, 100% { transform: translateX(0); opacity: .18; }
          50% { transform: translateX(35px); opacity: .9; }
        }
        @keyframes gtv-spark-dash {
          0% { transform: translate(0,0) scale(.65); opacity: .2; }
          30% { opacity: 1; }
          70% { opacity: .85; }
          100% { transform: translate(18px,-24px) scale(1.3); opacity: 0; }
        }
        @keyframes gtv-shield-orbit {
          from { transform: translate(-50%, -50%) rotate(0deg) scale(.86); }
          to { transform: translate(-50%, -50%) rotate(360deg) scale(1.02); }
        }
        @keyframes gtv-halo-spin {
          from { transform: rotateX(68deg) rotateZ(0deg); }
          to { transform: rotateX(68deg) rotateZ(360deg); }
        }
        @keyframes gtv-halo-spin-reverse {
          from { transform: rotateX(68deg) rotateZ(360deg); }
          to { transform: rotateX(68deg) rotateZ(0deg); }
        }
        @keyframes gtv-node-pulse {
          from { opacity: .45; transform: scale(.7); }
          to { opacity: 1; transform: scale(1.35); }
        }

        @keyframes gtv-core-flash {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.2); }
          35% { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.5); }
        }

        @keyframes gtv-scan {
          0% { opacity: 0; transform: translateY(-5vh); }
          15% { opacity: 0.8; }
          85% { opacity: 0.55; }
          100% { opacity: 0; transform: translateY(105vh); }
        }

        @keyframes gtv-scene-entrance {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.88);
            filter: blur(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }

        @keyframes gtv-brand-entrance {
          from {
            opacity: 0;
            transform: translateY(24px);
            filter: blur(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }

        @keyframes gtv-logo-cinematic {
          0% {
            opacity: 0.35;
            transform: scale(0.42) translateY(26px) rotateY(-18deg);
            filter: blur(5px);
          }
          42% {
            opacity: 1;
            transform: scale(1.32) translateY(0) rotateY(8deg);
            filter: blur(0);
          }
          66% {
            transform: scale(1.12) translateY(-3px) rotateY(0deg);
          }
          100% {
            opacity: 1;
            transform: scale(1.12) translateY(0) rotateY(0deg);
            filter: blur(0);
          }
        }

        @keyframes gtv-vault-door-open {
          0% {
            opacity: 1;
            transform: perspective(500px) rotateY(0deg);
          }
          100% {
            opacity: 0.12;
            transform: perspective(500px) rotateY(-112deg);
          }
        }

        @keyframes gtv-vault-door-open-right {
          0% {
            opacity: 1;
            transform: perspective(500px) rotateY(0deg);
          }
          100% {
            opacity: 0.12;
            transform: perspective(500px) rotateY(112deg);
          }
        }

        @keyframes gtv-logo-hover {
          from {
            transform: translateY(-5px) rotateY(-3deg);
          }
          to {
            transform: translateY(5px) rotateY(3deg);
          }
        }

        @keyframes gtv-ring-spin {
          from {
            transform: translateX(-50%) rotateX(67deg) rotateZ(0deg);
          }
          to {
            transform: translateX(-50%) rotateX(67deg) rotateZ(360deg);
          }
        }

        @keyframes gtv-ring-reverse {
          from {
            transform: translateX(-50%) rotateX(67deg) rotateZ(360deg);
          }
          to {
            transform: translateX(-50%) rotateX(67deg) rotateZ(0deg);
          }
        }

        @keyframes gtv-aura-pulse {
          from {
            opacity: 0.45;
            transform: scale(0.85);
          }
          to {
            opacity: 1;
            transform: scale(1.15);
          }
        }

        @keyframes gtv-reflection-pulse {
          from {
            opacity: 0.5;
            transform: scaleX(0.7);
          }
          to {
            opacity: 1;
            transform: scaleX(1.2);
          }
        }

        @keyframes gtv-tagline-glow {
          from {
            opacity: 0.65;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes gtv-loading-sweep {
          from {
            transform: translateX(-120%);
          }
          to {
            transform: translateX(340%);
          }
        }

        @keyframes gtv-particle-float {
          0% {
            opacity: 0;
            transform: translate3d(0, 15px, 0) scale(0.5);
          }
          45% {
            opacity: 0.9;
          }
          100% {
            opacity: 0;
            transform: translate3d(15px, -35px, 0) scale(1.3);
          }
        }

        @keyframes gtv-grid-drift {
          from {
            background-position: 0 0;
          }
          to {
            background-position: 48px 48px;
          }
        }

        @keyframes gtv-beam-flash {
          0%, 100% {
            opacity: 0;
          }
          45% {
            opacity: 0.65;
          }
          65% {
            opacity: 0.1;
          }
        }

        @keyframes gtv-status-blink {
          from {
            opacity: 0.4;
          }
          to {
            opacity: 1;
          }
        }

        @media (max-width: 600px) {
          .gtv-hud {
            font-size: 7px;
            letter-spacing: 0.1em;
          }

          .gtv-hud-top-left { top: 16px; left: 14px; }
          .gtv-hud-top-right { top: 16px; right: 14px; }
          .gtv-hud-bottom-left { bottom: 16px; left: 14px; }
          .gtv-hud-bottom-right { bottom: 16px; right: 14px; }

          .gtv-logo-stage {
            transform: scale(0.78);
            margin-top: -32px;
            margin-bottom: -20px;
          }

          .gtv-shield-frame {
            width: 190px;
            height: 220px;
          }

          .gtv-shield-halo {
            width: 110vw;
          }

          .gtv-hologram-ring {
            width: 95vw;
          }

          .gtv-floor-platform {
            bottom: 7%;
          }

          .gtv-system-status {
            font-size: 7px;
            letter-spacing: 0.12em;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .gtv-cinematic-intro *,
          .gtv-cinematic-intro {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
