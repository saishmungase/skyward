export function MarkdownRenderer({ text, isUser = false }) {
  const baseColor   = isUser ? "#d4dce8" : "#d4dce8";
  const mutedColor  = isUser ? "rgba(212,220,232,0.7)" : "rgba(212,220,232,0.7)";
  const codeColor   = isUser ? "#00f5a0" : "#a78bfa";
  const codeBg      = isUser ? "rgba(0,245,160,0.08)" : "rgba(167,139,250,0.1)";
  const quoteBorder = isUser ? "rgba(0,200,255,0.4)" : "rgba(167,139,250,0.4)";

  const segments = [];
  const codeBlockRe = /```(?:\w+)?\n?([\s\S]*?)```/g;
  let last = 0;
  let m;
  while ((m = codeBlockRe.exec(text)) !== null) {
    if (m.index > last) segments.push({ type: "text", content: text.slice(last, m.index) });
    segments.push({ type: "code_block", content: m[1].trim() });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ type: "text", content: text.slice(last) });

  const renderInline = (str) => {
    // Split on **bold**, *italic*, `code`
    const parts = [];
    const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g;
    let i = 0, r;
    while ((r = re.exec(str)) !== null) {
      if (r.index > i) parts.push(<span key={i}>{str.slice(i, r.index)}</span>);
      if (r[2] !== undefined) {
        parts.push(<strong key={r.index} style={{ color: baseColor, fontWeight: 700 }}>{r[2]}</strong>);
      } else if (r[3] !== undefined) {
        parts.push(<em key={r.index} style={{ color: mutedColor, fontStyle: "italic" }}>{r[3]}</em>);
      } else if (r[4] !== undefined) {
        parts.push(
          <code key={r.index} style={{
            color: codeColor, background: codeBg,
            padding: "1px 5px", borderRadius: 4,
            fontFamily: "'JetBrains Mono', monospace", fontSize: "0.9em",
          }}>{r[4]}</code>
        );
      }
      i = r.index + r[0].length;
    }
    if (i < str.length) parts.push(<span key={i + "end"}>{str.slice(i)}</span>);
    return parts.length ? parts : str;
  };

  const renderTextSegment = (content, segIdx) => {
    const lines = content.split("\n");
    const elements = [];
    let listBuffer = [];

    const flushList = () => {
      if (!listBuffer.length) return;
      elements.push(
        <ul key={`ul-${elements.length}`} style={{ margin: "6px 0 6px 4px", paddingLeft: 16, listStyle: "none" }}>
          {listBuffer.map((item, i) => (
            <li key={i} style={{ color: baseColor, fontSize: 12, lineHeight: 1.6, marginBottom: 2, display: "flex", gap: 7, alignItems: "flex-start" }}>
              <span style={{ color: codeColor, marginTop: 2, flexShrink: 0, fontSize: 9 }}>◆</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      listBuffer = [];
    };

    lines.forEach((line, li) => {
      // Headings
      const h3 = line.match(/^### (.+)/);
      const h2 = line.match(/^## (.+)/);
      const h1 = line.match(/^# (.+)/);
      // Bullet
      const bullet = line.match(/^[-*+] (.+)/);
      // Blockquote
      const quote = line.match(/^> (.+)/);
      // Numbered list
      const numbered = line.match(/^\d+\. (.+)/);

      if (h1) {
        flushList();
        elements.push(
          <div key={`${segIdx}-${li}`} style={{
            fontFamily: "'Orbitron', monospace", fontSize: 15, fontWeight: 800,
            color: codeColor, margin: "12px 0 6px",
            borderBottom: `1px solid ${quoteBorder}`, paddingBottom: 4,
          }}>
            {renderInline(h1[1])}
          </div>
        );
      } else if (h2) {
        flushList();
        elements.push(
          <div key={`${segIdx}-${li}`} style={{
            fontFamily: "'Orbitron', monospace", fontSize: 13, fontWeight: 700,
            color: codeColor, margin: "10px 0 4px",
          }}>
            {renderInline(h2[1])}
          </div>
        );
      } else if (h3) {
        flushList();
        elements.push(
          <div key={`${segIdx}-${li}`} style={{
            fontSize: 12, fontWeight: 700, color: baseColor, margin: "8px 0 3px",
            fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.5px",
          }}>
            {renderInline(h3[1])}
          </div>
        );
      } else if (bullet || numbered) {
        const txt = bullet ? bullet[1] : numbered[1];
        listBuffer.push(txt);
      } else if (quote) {
        flushList();
        elements.push(
          <div key={`${segIdx}-${li}`} style={{
            borderLeft: `3px solid ${quoteBorder}`,
            paddingLeft: 10, margin: "4px 0",
            color: mutedColor, fontStyle: "italic", fontSize: 12,
          }}>
            {renderInline(quote[1])}
          </div>
        );
      } else if (line.trim() === "") {
        flushList();
        if (elements.length > 0) elements.push(<div key={`${segIdx}-${li}-br`} style={{ height: 4 }} />);
      } else {
        flushList();
        elements.push(
          <div key={`${segIdx}-${li}`} style={{ color: baseColor, fontSize: 12, lineHeight: 1.6 }}>
            {renderInline(line)}
          </div>
        );
      }
    });
    flushList();
    return elements;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {segments.map((seg, si) => {
        if (seg.type === "code_block") {
          return (
            <div key={si} style={{
              background: "rgba(0,0,0,0.4)", border: `1px solid ${quoteBorder}`,
              borderRadius: 8, padding: "10px 14px", margin: "4px 0",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              color: codeColor, lineHeight: 1.7, overflowX: "auto",
              whiteSpace: "pre",
            }}>
              {seg.content}
            </div>
          );
        }
        return <div key={si}>{renderTextSegment(seg.content, si)}</div>;
      })}
    </div>
  );
}