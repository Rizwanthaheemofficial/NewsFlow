import React, { useRef, useEffect, useState } from 'react';
import { TemplateType, WPPost } from '../types';
import { TEMPLATE_CONFIGS, APP_LOGO_BASE64 } from '../constants';

interface CanvasPreviewProps {
  post: WPPost;
  template: TemplateType;
  logoUrl?: string;
  wordpressUrl?: string;
  onExport?: (dataUrl: string) => void;
}

const CanvasPreview: React.FC<CanvasPreviewProps> = ({ post, template, logoUrl, wordpressUrl, onExport }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [useFallbackLogo, setUseFallbackLogo] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const getProxyTier = (url: string, tier: number) => {
      const cleanUrl = encodeURIComponent(url);
      const cb = `&cb=${Date.now()}`;
      switch (tier) {
        case 0: return `https://wsrv.nl/?url=${cleanUrl}${cb}&output=png`;
        case 1: return `https://corsproxy.io/?${url}`;
        case 2: return `https://api.allorigins.win/raw?url=${cleanUrl}`;
        default: return url;
      }
    };

    /**
     * Resilient image loader that handles CORS and multiple proxy tiers.
     * Robust handling for Data URLs and standard remote URLs.
     */
    const loadImageResilient = async (url: string): Promise<HTMLImageElement> => {
      if (!url) throw new Error("URL is missing");
      
      // Fast path for Data URLs (uploads)
      if (url.startsWith('data:')) {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("Data URL rendering failed"));
          img.src = url;
        });
      }

      const maxTiers = 3;
      let lastError: string = "Unknown error";
      
      for (let tier = 0; tier < maxTiers; tier++) {
        try {
          const src = getProxyTier(url, tier);
          const result = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Tier ${tier} standard load failed`));
            img.src = src;
            setTimeout(() => reject(new Error(`Tier ${tier} timeout`)), 8000);
          });
          return result;
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
        }
      }
      throw new Error(`Failed to load image: ${lastError}`);
    };

    const render = async () => {
      const config = TEMPLATE_CONFIGS[template] || TEMPLATE_CONFIGS[TemplateType.STANDARD];
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Background
      try {
        const bgImg = await loadImageResilient(post.featuredImageUrl);
        const scale = Math.max(canvas.width / bgImg.width, canvas.height / bgImg.height);
        const x = (canvas.width / 2) - (bgImg.width / 2) * scale;
        const y = (canvas.height / 2) - (bgImg.height / 2) * scale;
        ctx.drawImage(bgImg, x, y, bgImg.width * scale, bgImg.height * scale);
      } catch (e) {
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // 2. Overlays
      if (template === TemplateType.MODERN_NEWS) {
        const margin = 35;
        const boxWidth = canvas.width - (margin * 2);
        const boxHeight = 460;
        const rectY = canvas.height - boxHeight - 50;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(margin, rectY, boxWidth, boxHeight);

        ctx.fillStyle = config.barColor;
        ctx.fillRect(0, canvas.height - 85, canvas.width, 85);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 14;
        ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, canvas.width - ctx.lineWidth, canvas.height - ctx.lineWidth);

        ctx.textAlign = 'center';
        ctx.font = '800 68px Inter';
        
        const words = post.title.split(' ');
        let lines: string[] = [];
        let line = '';
        const maxWidth = boxWidth - 100;

        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            lines.push(line.trim());
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line.trim());

        let currentTitleY = rectY + 115;
        lines.forEach((l, idx) => {
          ctx.fillStyle = (idx >= lines.length - 1) ? config.accentColor : config.textColor;
          ctx.fillText(l, canvas.width / 2, currentTitleY);
          currentTitleY += 90;
        });

        ctx.fillStyle = '#ffffff';
        ctx.font = '800 32px Inter';
        ctx.fillText((wordpressUrl || 'WORLDNEWSTODAY.LIVE').toUpperCase(), canvas.width / 2, canvas.height - 35);

      } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 68px Inter';
        ctx.textAlign = 'left';
        const words = post.title.split(' ');
        let line = '';
        let currentY = canvas.height - 150;
        const lines: string[] = [];
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > canvas.width - 120 && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line);
        lines.reverse().forEach((l, i) => {
          ctx.fillText(l.trim(), 60, currentY - (i * 85));
        });
      }

      // 3. Logo
      try {
        const logoToUse = (logoUrl && logoUrl.trim() !== "" && !useFallbackLogo) ? logoUrl : APP_LOGO_BASE64;
        const logo = await loadImageResilient(logoToUse).catch(async (err) => {
          console.warn("Logo load failed, falling back to brand logo", err);
          return await loadImageResilient(APP_LOGO_BASE64);
        });
        
        const logoHeight = 120;
        const logoWidth = (logo.width / logo.height) * logoHeight;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 10;
        const padding = 15;
        ctx.fillRect(40 - padding, 40 - padding, Math.min(logoWidth, 400) + (padding * 2), logoHeight + (padding * 2));
        
        ctx.shadowBlur = 0;
        ctx.drawImage(logo, 40, 40, Math.min(logoWidth, 400), logoHeight);
      } catch (e) {
        console.error("Critical logo failure:", e);
      }

      // 4. Export
      if (onExport) {
        try {
          onExport(canvas.toDataURL('image/png'));
        } catch (exportErr) {
          // If we are currently using a custom logo and it fails export, switch to fallback
          if (!useFallbackLogo && logoUrl) {
            setUseFallbackLogo(true);
          }
        }
      }
    };

    render();
  }, [post, template, logoUrl, wordpressUrl, onExport, useFallbackLogo]);

  useEffect(() => {
    setUseFallbackLogo(false);
  }, [logoUrl]);

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gray-900 border-4 border-white aspect-square w-full">
      <canvas ref={canvasRef} width={1080} height={1080} className="w-full h-full" />
    </div>
  );
};

export default CanvasPreview;