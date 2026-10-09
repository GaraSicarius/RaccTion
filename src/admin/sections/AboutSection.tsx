import { Info } from 'lucide-react';

export default function AboutSection() {
  const version = chrome.runtime.getManifest().version;
  return (
    <section className="adm-section">
      <div className="adm-section-head"><Info size={19} /><h2>About</h2></div>
      <div className="adm-section-body">
        <p><strong>RaccTion v{version}</strong> — scan a promo page and see what it really asks for.</p>

        <p><strong>What runs locally on this device:</strong> reading the page text and forms, the keyword checks, the Gemini Nano analysis, scoring, and all storage (settings, history, PIN hash). RaccTion sends nothing to any server.</p>

        <p><strong>What needs internet:</strong> the one-time Gemini Nano download, which Chrome itself performs, and loading the websites you scan.</p>

        <p><strong>Why local?</strong> Promo pages are exactly where people get asked for card numbers, OTPs, IDs and e-wallet logins. Sending those pages — and your browsing — to a cloud AI to check them would leak the very information you&apos;re trying to protect. RaccTion reads the page and runs Gemini Nano on your own device: nothing is uploaded, there is no API key or account, it costs nothing per scan, and once the model is downloaded it keeps working offline.</p>

        <p className="adm-help">Trust levels are signals, not a guarantee — always check the domain yourself.</p>
      </div>
    </section>
  );
}
