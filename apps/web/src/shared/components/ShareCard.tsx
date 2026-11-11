import { useRef, useState, type ReactNode } from 'react';
import { toPng } from 'html-to-image';
import { Download, Share2 } from 'lucide-react';
import { Button, useToast } from '@/shared/ui';

export function ShareableCard({ fileName, children, label = 'Baixar para os stories' }: { fileName: string; children: ReactNode; label?: string }) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const exportImage = async () => {
    if (!nodeRef.current) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(nodeRef.current, { pixelRatio: 1080 / nodeRef.current.offsetWidth, cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `${fileName}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Copa Kaleo' });
      } else {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${fileName}.png`;
        link.click();
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') toast('Não foi possível gerar a imagem.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={nodeRef} className="aspect-[9/16] w-full max-w-[320px] overflow-hidden rounded-2xl">
        {children}
      </div>
      <Button variant="secondary" size="sm" loading={busy} onClick={exportImage} icon={'share' in navigator ? <Share2 className="size-4" /> : <Download className="size-4" />}>
        {label}
      </Button>
    </div>
  );
}

export function StoryFrame({ children, accent = '#7c3aed' }: { children: ReactNode; accent?: string }) {
  return (
    <div
      className="relative flex size-full flex-col items-center justify-between overflow-hidden p-6 text-center text-white"
      style={{ background: `radial-gradient(circle at 50% 0%, ${accent} 0%, #0b1120 55%, #030712 100%)` }}
    >
      <div className="flex items-center gap-2">
        <img src="/img/Kaleo.jpg" alt="" className="size-8 rounded-lg" />
        <span className="text-lg font-black uppercase tracking-tighter">Copa Kaleo</span>
      </div>
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-4">{children}</div>
      <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50">copakaleo.web.app</span>
    </div>
  );
}
