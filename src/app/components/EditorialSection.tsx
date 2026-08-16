import type { ReactNode } from "react";

type SectionTone = "base" | "raised" | "accent";

export function EditorialSection({
  children,
  className = "",
  id,
  tone = "base",
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  tone?: SectionTone;
}) {
  return (
    <section id={id} className={`gmm-band gmm-band--${tone} ${className}`.trim()}>
      <div className="gmm-shell">{children}</div>
    </section>
  );
}

export function EditorialHeading({
  eyebrow,
  title,
  description,
  action,
  size = "section",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  size?: "section" | "display";
}) {
  return (
    <div className="gmm-heading">
      <div className="min-w-0">
        {eyebrow ? <p className="gmm-kicker">{eyebrow}</p> : null}
        <h2 className={size === "display" ? "gmm-display" : "gmm-section-title"}>
          {title}
        </h2>
        {description ? <div className="gmm-heading-copy">{description}</div> : null}
      </div>
      {action ? <div className="gmm-heading-action">{action}</div> : null}
    </div>
  );
}
