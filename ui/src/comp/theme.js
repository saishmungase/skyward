export const SERVER = "https://testing-logs-o20x.onrender.com";
export const WS_SERVER = "wss://testing-logs-o20x.onrender.com";
export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

export const LEVEL_STYLES = {
  INFO:    { border: "#00c8ff", bg: "rgba(0,200,255,0.08)", text: "#00c8ff" },
  WARN:    { border: "#ffb800", bg: "rgba(255,184,0,0.08)", text: "#ffb800" },
  ERROR:   { border: "#ff4545", bg: "rgba(255,69,69,0.08)", text: "#ff4545" },
  DEBUG:   { border: "#a78bfa", bg: "rgba(167,139,250,0.08)", text: "#a78bfa" },
  UNKNOWN: { border: "#4a6070", bg: "rgba(74,96,112,0.08)", text: "#4a6070" },
};

export const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Orbitron:wght@400;600;700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    background: #05080d;
    color: #d4dce8;
    font-family: 'DM Sans', sans-serif;
    min-height: 100vh;
    overflow-x: hidden;
  }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1e2d3d; border-radius: 2px; }
  input, textarea { font-family: 'DM Sans', sans-serif; }
  input::placeholder, textarea::placeholder { color: #3a5068; }
  input:focus, textarea:focus { outline: none; }
  button { cursor: pointer; font-family: 'DM Sans', sans-serif; }
  a { text-decoration: none; color: inherit; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; box-shadow: 0 0 6px currentColor; }
    50%       { opacity: 0.4; box-shadow: none; }
  }
  @keyframes scanline {
    0%   { transform: translateY(-100%); }
    100% { transform: translateY(100vh); }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes glow {
    0%, 100% { text-shadow: 0 0 8px #00f5a0; }
    50%       { text-shadow: 0 0 24px #00f5a0, 0 0 48px #00c8ff; }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
`;