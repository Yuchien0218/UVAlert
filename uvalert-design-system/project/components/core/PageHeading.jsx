import React from "react";

/** Page title block: caption eyebrow, serif display-md title, body copy. */
export function PageHeading({ eyebrow, title, body, style }) {
  return (
    <header className="page-heading" style={style}>
      {eyebrow ? <p className="page-heading__eyebrow">{eyebrow}</p> : null}
      <h1 className="page-heading__title">{title}</h1>
      {body ? <p className="page-heading__body">{body}</p> : null}
    </header>
  );
}
