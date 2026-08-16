import { ArrowUpRight, Music2, Upload } from "lucide-react";
import Link from "next/link";

const footerGroups = [
  {
    title: "Explore",
    links: [
      ["/midi", "MIDI library"],
      ["/creators", "Top creators"],
      ["/awards", "Awards & ranks"],
      ["/midi?sort=downloads", "Most downloaded"],
    ],
  },
  {
    title: "Your library",
    links: [
      ["/bookmarks", "Bookmarks"],
      ["/myuploads", "My uploads"],
      ["/connections", "Connections"],
      ["/profile", "Profile"],
    ],
  },
  {
    title: "Information",
    links: [
      ["/about", "About"],
      ["/contact", "Contact"],
      ["/privacy", "Privacy"],
      ["/terms", "Terms"],
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="gmm-site-footer">
      <div className="gmm-footer-cta">
        <div className="gmm-shell">
          <div>
            <p className="gmm-kicker">Add to the library</p>
            <h2>Made something worth hearing?</h2>
          </div>
          <Link href="/upload" className="gmm-button-primary"><Upload size={17} /> Upload MIDI</Link>
        </div>
      </div>

      <div className="gmm-shell gmm-footer-grid">
        <div className="gmm-footer-brand">
          <Link href="/" aria-label="GiveMeMIDI home"><Music2 size={24} /> GiveMeMIDI</Link>
          <p>A community library for MIDI files, sheet music, and the people who arrange them.</p>
        </div>

        {footerGroups.map((group) => (
          <div key={group.title} className="gmm-footer-column">
            <h3>{group.title}</h3>
            {group.links.map(([href, label]) => (
              <Link key={href} href={href}>{label}<ArrowUpRight size={13} /></Link>
            ))}
          </div>
        ))}
      </div>

      <div className="gmm-shell gmm-footer-signature" aria-hidden="true">GIVEMEMIDI</div>
      <div className="gmm-footer-bottom">
        <div className="gmm-shell">
          <span>Copyright {new Date().getFullYear()} GiveMeMIDI</span>
          <span>Share only files you have permission to distribute.</span>
        </div>
      </div>
    </footer>
  );
}
