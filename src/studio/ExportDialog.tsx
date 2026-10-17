import { useState } from 'react';
import { Check, Code2, Copy, Download, Package, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { EMBED_SNIPPET } from './exportTemplate';
import { exportExperience } from './export';
import { download, message, slug } from './files';
import type { Studio } from './useStudio';

export function ExportDialog({ studio }: { studio: Studio }) {
  const [busy, setBusy] = useState(false), [copied, setCopied] = useState(false);
  const exportZip = async () => {
    setBusy(true);
    try { download(await exportExperience(studio.project), `${slug(studio.project.name)}.zip`); }
    catch (error) { studio.setError(message(error)); }
    finally { setBusy(false); }
  };
  return <Dialog.Root><Dialog.Trigger asChild><button className="primary-button"><Code2 size={14} />Export experience</button></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="export-dialog">
      <div className="dialog-header"><div className="dialog-icon"><Package size={22} /></div><Dialog.Close className="icon-button" aria-label="Close export"><X size={16} /></Dialog.Close></div>
      <Dialog.Title>Take your particles anywhere.</Dialog.Title><Dialog.Description>A standalone WebGL runtime, your director sequence, and a working scroll demo. Ready for any website.</Dialog.Description>
      <div className="export-spec"><span>{studio.project.keyframes.length} keyframes</span><span>{studio.project.particleCount.toLocaleString()} particles</span><span>No Ghost required</span></div>
      <div className="code-heading"><span>EMBED API</span><button className="small-button" onClick={() => navigator.clipboard.writeText(EMBED_SNIPPET).then(() => setCopied(true)).catch((error: unknown) => studio.setError(message(error)))}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? 'Copied' : 'Copy'}</button></div>
      <pre className="code-block"><code>{EMBED_SNIPPET}</code></pre>
      <p className="export-note">Host the export over HTTP. Size the particle container in your CSS. The runtime supports scroll, timed, and manual playback.</p>
      <div className="dialog-actions"><button className="small-button" onClick={() => download(JSON.stringify(studio.project, null, 2), `${slug(studio.project.name)}.json`)}>Project JSON</button><button className="primary-button" disabled={busy} onClick={exportZip}><Download size={14} />{busy ? 'Bundling…' : 'Download website bundle'}</button></div>
    </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
