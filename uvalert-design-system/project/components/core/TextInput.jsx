import React from "react";

/** Text field. 44px min height, hairline border, apricot focus ring at 15%. */
export function TextInput({ label, hint, id, error, as = "input", className = "", style, ...rest }) {
  const Tag = as;
  const inputId = id || `field-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div style={{ display: "grid", gap: "var(--space-xs)" }}>
      {label ? (
        <label htmlFor={inputId} className="title-sm">
          {label}
        </label>
      ) : null}
      <Tag
        id={inputId}
        className={`text-input ${className}`.trim()}
        aria-invalid={error ? "true" : undefined}
        style={error ? { borderColor: "var(--color-error)", ...style } : style}
        {...rest}
      />
      {error ? (
        <p className="caption" style={{ color: "var(--color-error)" }} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="caption">{hint}</p>
      ) : null}
    </div>
  );
}
