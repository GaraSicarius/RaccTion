import { Info } from 'lucide-react';

export default function AboutSection() {
  const version = chrome.runtime.getManifest().version;
  return (
    <section className="adm-section">
      <div className="adm-section-head"><Info size={19} /><h2>About</h2></div>
      <div className="adm-section-body">
        <p><strong>RaccTion v{version}</strong> — scan a promo page and see what it really asks for.</p>

        <p><strong>What runs locally on this device:</strong> reading page text and forms, keyword checks, Qwen3 0.6B inference through a CPU-only llama.cpp server, scoring, and storage. Page text goes only to the server on this same laptop; no cloud AI receives it.</p>

        <p><strong>What needs internet:</strong> the initial runtime and model downloads, and loading websites. Once installed, the local AI server can analyze saved demo pages offline.</p>

        <p><strong>Why local?</strong> Promo pages can ask for card numbers, OTPs, IDs and e-wallet logins. Local inference keeps the captured page text on your device, needs no cloud account or API key, and works without internet after installation. The small model can make mistakes, so quotes are checked against page text and keyword checks remain active.</p>

        <p className="adm-help">Trust levels are signals, not a guarantee — always check the domain yourself.</p>
      </div>
    </section>
  );
}
