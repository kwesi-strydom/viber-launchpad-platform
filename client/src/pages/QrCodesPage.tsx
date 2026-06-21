import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, QrCode, Loader2 } from 'lucide-react';
import QRCode from 'qrcode';

interface SafeUser { id: number; isAdmin?: boolean; }

const QrCodesPage = () => {
  const { data: currentUser, isLoading } = useQuery<{ user: SafeUser }>({ queryKey: ['/api/auth/user'] });
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [audienceUrl, setAudienceUrl] = useState('');
  const [competitorPng, setCompetitorPng] = useState('');
  const [audiencePng, setAudiencePng] = useState('');

  useEffect(() => {
    const base = window.location.origin;
    setCompetitorUrl(`${base}/login?role=competitor`);
    setAudienceUrl(`${base}/login?role=audience`);
  }, []);

  useEffect(() => {
    if (!competitorUrl) return;
    QRCode.toDataURL(competitorUrl, {
      width: 320,
      margin: 2,
      color: { dark: '#0a0b0d', light: '#ffffff' },
    })
      .then(setCompetitorPng)
      .catch((err) => console.error('Failed to generate competitor QR', err));
  }, [competitorUrl]);

  useEffect(() => {
    if (!audienceUrl) return;
    QRCode.toDataURL(audienceUrl, {
      width: 320,
      margin: 2,
      color: { dark: '#0a0b0d', light: '#ffffff' },
    })
      .then(setAudiencePng)
      .catch((err) => console.error('Failed to generate audience QR', err));
  }, [audienceUrl]);

  const downloadQr = (dataUrl: string, filename: string) => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="arena-wrap flex items-center justify-center min-h-[60vh]">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser?.user?.isAdmin) {
    return (
      <div className="arena-wrap flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="arena-wrap py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <QrCode className="text-primary" size={32} />
          <h1 className="display text-4xl">QR Codes</h1>
        </div>
        <p className="text-muted-foreground mb-10">
          Print or display these QR codes at your event. Scanning takes users directly to the right login flow.
        </p>

        <div className="arena-grid cols-2">
          <QrCard
            title="Competitors"
            subtitle="Scan to join as a competitor"
            pngUrl={competitorPng}
            url={competitorUrl}
            onDownload={() => downloadQr(competitorPng, 'qr-competitor.png')}
          />
          <QrCard
            title="Audience"
            subtitle="Scan to browse & rate apps"
            pngUrl={audiencePng}
            url={audienceUrl}
            onDownload={() => downloadQr(audiencePng, 'qr-audience.png')}
          />
        </div>
      </div>
    </div>
  );
};

interface QrCardProps {
  title: string;
  subtitle: string;
  pngUrl: string;
  url: string;
  onDownload: () => void;
}

const QrCard = ({ title, subtitle, pngUrl, url, onDownload }: QrCardProps) => (
  <div className="card flex flex-col items-center gap-6 text-center relative overflow-hidden">
    <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>

    <div>
      <h2 className="h2">{title}</h2>
      <p className="text-muted-foreground mt-2">{subtitle}</p>
    </div>

    <div className="panel p-4 bg-white inline-block rounded-md">
      {pngUrl ? (
        <img
          src={pngUrl}
          alt={`${title} QR code`}
          width={280}
          height={280}
          style={{ display: 'block', borderRadius: '4px' }}
        />
      ) : (
        <div className="w-[280px] h-[280px] flex items-center justify-center text-ink-900/50 text-sm">
          Generating…
        </div>
      )}
    </div>

    <p className="mono-label break-all px-2 w-full">{url}</p>

    <button onClick={onDownload} className="btn btn-primary w-full" disabled={!pngUrl}>
      <Download size={16} />
      Download PNG
    </button>
  </div>
);

export default QrCodesPage;
