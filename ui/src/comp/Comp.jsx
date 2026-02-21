import { useState } from "react";

export function Toast({ msg, type, visible }) {
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: "#0a1628",
      border: `1px solid ${type === "error" ? "rgba(255,69,69,0.5)" : "rgba(0,245,160,0.4)"}`,
      borderRadius: 10, padding: "12px 20px", fontSize: 13,
      fontFamily: "'JetBrains Mono', monospace", color: "#d4dce8",
      boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${type === "error" ? "rgba(255,69,69,0.1)" : "rgba(0,245,160,0.05)"}`,
      transform: visible ? "translateY(0)" : "translateY(80px)",
      opacity: visible ? 1 : 0,
      transition: "all 0.35s cubic-bezier(0.34,1.56,0.64,1)",
      display: "flex", alignItems: "center", gap: 10,
      pointerEvents: visible ? "auto" : "none",
    }}>
      <span style={{ fontSize: 16 }}>{type === "error" ? "⚠" : "✓"}</span>
      {msg}
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState({ msg: "", type: "success", visible: false });
  const showToast = (msg, type = "success") => {
    setToast({ msg, type, visible: true });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2800);
  };
  return [toast, showToast];
}

export function GlowButton({ children, onClick, variant = "primary", style = {}, disabled = false }) {
  const styles = {
    primary: {
      background: "linear-gradient(135deg, #00f5a0, #00c8d4)",
      color: "#05080d", border: "none",
      boxShadow: "0 0 20px rgba(0,245,160,0.2)",
    },
    danger: {
      background: "rgba(255,69,69,0.1)", color: "#ff4545",
      border: "1px solid rgba(255,69,69,0.35)", boxShadow: "none",
    },
    ghost: {
      background: "rgba(255,255,255,0.04)", color: "#d4dce8",
      border: "1px solid #1e2d3d", boxShadow: "none",
    },
    accent: {
      background: "rgba(0,200,255,0.08)", color: "#00c8ff",
      border: "1px solid rgba(0,200,255,0.3)",
      boxShadow: "0 0 16px rgba(0,200,255,0.1)",
    },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: "10px 20px", borderRadius: 8,
        fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600,
        transition: "all 0.2s", cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        ...styles[variant], ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Card({ children, style = {}, glow = false }) {
  return (
    <div style={{
      background: "rgba(10,22,40,0.8)", border: "1px solid #1e2d3d", borderRadius: 14,
      backdropFilter: "blur(12px)",
      boxShadow: glow
        ? "0 0 40px rgba(0,245,160,0.05), inset 0 1px 0 rgba(255,255,255,0.04)"
        : "inset 0 1px 0 rgba(255,255,255,0.03)",
      ...style,
    }}>
      {children}
    </div>
  );
}

export function Badge({ children, color = "#00f5a0" }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20,
      fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
      fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase",
      background: `${color}14`, color, border: `1px solid ${color}30`,
    }}>
      {children}
    </span>
  );
}

export function Spinner() {
  return (
    <div style={{
      width: 16, height: 16,
      border: "2px solid rgba(0,245,160,0.2)",
      borderTop: "2px solid #00f5a0",
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
    }} />
  );
}

export function GridBackground() {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
      backgroundImage: `
        linear-gradient(rgba(0,245,160,0.018) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,245,160,0.018) 1px, transparent 1px)
      `,
      backgroundSize: "48px 48px",
    }} />
  );
}

export function AgentOrb({ size = 48, active = false }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "radial-gradient(circle at 35% 35%, #00f5a0, #00c8d4 50%, #0066ff)",
      boxShadow: active
        ? "0 0 30px rgba(0,245,160,0.5), 0 0 60px rgba(0,200,212,0.2)"
        : "0 0 16px rgba(0,245,160,0.2)",
      animation: active ? "pulse 2s ease-in-out infinite" : "none",
      flexShrink: 0,
    }} />
  );
}

export function MarkdownText({ text, style = {} }) {
  const parseMarkdown = (content) => {
    if (!content) return null;
    const parts = [];
    let lastIndex = 0;

    // Handle **bold**, *italic*, `code`, numbered lists, etc
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|^\d+\.\s|^[-*]\s)/gm;
    let match;
    const matches = [];
    
    while ((match = regex.exec(content)) !== null) {
      matches.push({ text: match[0], index: match.index });
    }

    if (matches.length === 0) {
      return content;
    }

    // Build elements with formatting
    let result = [];
    let idx = 0;
    const lines = content.split('\n');

    return (
      <div>
        {lines.map((line, lineIdx) => {
          const elements = [];
          let lastIdx = 0;

          // Find all formatting in this line
          const boldRegex = /\*\*([^*]+)\*\*/g;
          const italicRegex = /\*([^*]+)\*/g;
          const codeRegex = /`([^`]+)`/g;

          let boldMatch;
          const boldMatches = [];
          
          if (line.includes('**')) {
            while ((boldMatch = boldRegex.exec(line)) !== null) {
              boldMatches.push({ text: boldMatch[1], start: boldMatch.index, end: boldMatch.index + boldMatch[0].length });
            }
          }

          // Simple line parser
          if (line.match(/^\d+\./)) {
            elements.push(
              <div key={lineIdx} style={{ marginLeft: '20px', marginBottom: '4px' }}>
                {renderLineWithFormatting(line)}
              </div>
            );
          } else if (line.match(/^[-*]\s/)) {
            elements.push(
              <div key={lineIdx} style={{ marginLeft: '20px', marginBottom: '4px' }}>
                • {renderLineWithFormatting(line.substring(2))}
              </div>
            );
          } else {
            elements.push(
              <div key={lineIdx} style={{ marginBottom: '6px' }}>
                {renderLineWithFormatting(line)}
              </div>
            );
          }
          
          return elements;
        })}
      </div>
    );

    function renderLineWithFormatting(line) {
      const parts = [];
      let lastIdx = 0;
      const boldRegex = /\*\*([^*]+)\*\*/g;
      let boldMatch;

      while ((boldMatch = boldRegex.exec(line)) !== null) {
        if (boldMatch.index > lastIdx) {
          parts.push(line.substring(lastIdx, boldMatch.index));
        }
        parts.push(
          <strong key={boldMatch.index} style={{ color: '#00f5a0', fontWeight: '700' }}>
            {boldMatch[1]}
          </strong>
        );
        lastIdx = boldRegex.lastIndex;
      }

      if (lastIdx < line.length) {
        parts.push(line.substring(lastIdx));
      }

      return parts.length > 0 ? parts : line;
    }
  };

  return (
    <div style={{ ...style, whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
      {parseMarkdown(text)}
    </div>
  );
}