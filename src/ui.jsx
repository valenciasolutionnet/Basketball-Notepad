import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { C, addItem, toggleItem, removeItem } from "./theme.jsx";

export function PhaseButton({ active, onClick, icon: Icon, label, sub }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        padding: "12px 8px",
        background: active ? C.panel3 : "transparent",
        border: "none",
        borderBottom: `3px solid ${active ? C.amber : "transparent"}`,
        cursor: "pointer",
        transition: "background 0.15s ease",
      }}
    >
      <Icon size={18} color={active ? C.amber : C.chalkDim} strokeWidth={2.25} />
      <span
        style={{
          fontFamily: "'Anton', sans-serif",
          fontSize: 13,
          letterSpacing: "0.08em",
          color: active ? C.chalk : C.chalkDim,
        }}
      >
        {label}
      </span>
      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: C.chalkFaint }}>{sub}</span>
    </button>
  );
}

export function TabPill({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 12px",
        borderRadius: 999,
        border: `1px solid ${active ? C.amber : C.line}`,
        background: active ? C.amber : "transparent",
        color: active ? C.amberInk : C.chalkDim,
        fontFamily: "'Inter', sans-serif",
        fontWeight: 600,
        fontSize: 12.5,
        whiteSpace: "nowrap",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      <Icon size={13.5} strokeWidth={2.5} />
      {label}
    </button>
  );
}

export function Panel({ title, subtitle, icon: Icon, children }) {
  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderRadius: 10,
        padding: "18px 16px 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: C.panel3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={16} color={C.amber} strokeWidth={2.25} />
        </div>
        <div>
          <h2
            style={{
              fontFamily: "'Anton', sans-serif",
              fontSize: 19,
              letterSpacing: "0.02em",
              color: C.chalk,
              margin: 0,
              textTransform: "uppercase",
            }}
          >
            {title}
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: C.chalkDim, margin: "2px 0 0" }}>
            {subtitle}
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}

export function IconBtn({ onClick, children, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 30,
        height: 30,
        borderRadius: 7,
        border: `1px solid ${C.line}`,
        background: "transparent",
        color: danger ? C.red : C.chalkDim,
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

export function TextInput({ value, onChange, placeholder, onEnter }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      onKeyDown={(e) => {
        if (e.key === "Enter" && onEnter) onEnter();
      }}
      style={{
        flex: 1,
        background: C.bg2,
        border: `1px solid ${C.line}`,
        borderRadius: 7,
        padding: "9px 11px",
        color: C.chalk,
        fontFamily: "'Inter', sans-serif",
        fontSize: 13.5,
        outline: "none",
      }}
    />
  );
}

export function TextAreaField({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <label
          style={{
            display: "block",
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            color: C.sage,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            marginBottom: 6,
          }}
        >
          {label}
        </label>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
          width: "100%",
          resize: "vertical",
          background: C.bg2,
          border: `1px solid ${C.line}`,
          borderRadius: 7,
          padding: "10px 11px",
          color: C.chalk,
          fontFamily: "'Inter', sans-serif",
          fontSize: 13.5,
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

export function AddRow({ value, setValue, onAdd, placeholder }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
      <TextInput value={value} onChange={setValue} placeholder={placeholder} onEnter={onAdd} />
      <button
        onClick={onAdd}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "0 14px",
          borderRadius: 7,
          border: "none",
          background: C.amber,
          color: C.amberInk,
          fontFamily: "'Inter', sans-serif",
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        <Plus size={15} strokeWidth={3} /> Add
      </button>
    </div>
  );
}

export function Checklist({ items, setItems, placeholder, empty }) {
  const [val, setVal] = useState("");
  return (
    <div>
      <AddRow value={val} setValue={setVal} placeholder={placeholder} onAdd={() => { addItem(setItems, val); setVal(""); }} />
      {items.length === 0 && (
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: C.chalkFaint, fontStyle: "italic" }}>{empty}</p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((i) => (
          <div
            key={i.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: C.bg2,
              border: `1px solid ${C.line}`,
              borderRadius: 7,
              padding: "8px 10px",
            }}
          >
            <button
              onClick={() => toggleItem(setItems, i.id)}
              style={{
                width: 19,
                height: 19,
                borderRadius: 5,
                border: `1.5px solid ${i.done ? C.sage : C.chalkDim}`,
                background: i.done ? C.sage : "transparent",
                cursor: "pointer",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {i.done && <span style={{ color: C.bg2, fontSize: 12, fontWeight: 900, lineHeight: 1 }}>✓</span>}
            </button>
            <span
              style={{
                flex: 1,
                fontFamily: "'Inter', sans-serif",
                fontSize: 13.5,
                color: i.done ? C.chalkFaint : C.chalk,
                textDecoration: i.done ? "line-through" : "none",
              }}
            >
              {i.text}
            </span>
            <IconBtn onClick={() => removeItem(setItems, i.id)} danger>
              <Trash2 size={14} />
            </IconBtn>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RatingRow({ label, description, value, onChange }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13.5, color: C.chalk }}>{label}</span>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, color: C.amber, fontWeight: 700 }}>{value}</span>
      </div>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: C.chalkDim, margin: "0 0 8px" }}>{description}</p>
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="np-slider"
      />
    </div>
  );
}

export function SubHeading({ children }) {
  return (
    <h3
      style={{
        fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: C.sage,
        textTransform: "uppercase", letterSpacing: "0.05em", margin: "18px 0 8px",
      }}
    >
      {children}
    </h3>
  );
}
