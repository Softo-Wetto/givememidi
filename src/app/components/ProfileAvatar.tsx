import { User } from "lucide-react";

type Props = {
  src?: string | null;
  name?: string | null;
  sizeClassName?: string;
  className?: string;
};

function initialsFromName(name?: string | null) {
  const clean = (name || "").trim();
  if (!clean) return "";
  return clean
    .split(/\s+|_+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ProfileAvatar({
  src,
  name,
  sizeClassName = "h-10 w-10",
  className = "",
}: Props) {
  const initials = initialsFromName(name);

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-cyan-300/25 bg-slate-900 text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.12)] ${sizeClassName} ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name || "Profile"} className="h-full w-full object-cover" />
      ) : initials ? (
        <span className="text-sm font-black">{initials}</span>
      ) : (
        <User className="h-1/2 w-1/2 text-cyan-200" />
      )}
    </span>
  );
}
