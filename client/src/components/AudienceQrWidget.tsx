import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

const AudienceQrWidget = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState('');

  useEffect(() => {
    const u = `${window.location.origin}/login?role=audience`;
    setUrl(u);
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, u, {
        width: 200,
        margin: 2,
        color: { dark: '#0a0b0d', light: '#e9ecf0' },
      });
    }
  }, []);

  return (
    <div className="hidden md:flex fixed bottom-6 right-6 z-30 items-center gap-5 p-5 card shadow-2xl backdrop-blur-md bg-ink-850/90">
      <div className="rounded-[6px] overflow-hidden border border-ink-600 bg-ink-100 p-1">
        <canvas ref={canvasRef} style={{ display: 'block', width: '100px', height: '100px' }} width={100} height={100} />
      </div>
      <div className="flex flex-col">
        <p className="kicker mb-1">Live Access</p>
        <p className="h3 text-foreground">Scan to<br/>Rate Apps</p>
      </div>
    </div>
  );
};

export default AudienceQrWidget;