
import React, { useRef, useEffect } from 'react';
import { TemplateType, WPPost } from '../types';
import { TEMPLATE_CONFIGS } from '../constants';

interface CanvasPreviewProps {
  post: WPPost;
  template: TemplateType;
  logoUrl?: string;
  wordpressUrl?: string;
  onExport?: (dataUrl: string) => void;
}

const CanvasPreview: React.FC<CanvasPreviewProps> = ({ post, template, logoUrl, wordpressUrl, onExport }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    /**
     * Generates proxy URLs using various providers to bypass different types of blocks.
     */
    const getProxyTier = (url: string, tier: number) => {
      const cleanUrl = encodeURIComponent(url);
      const cb = `&cb=${Date.now()}`;
      switch (tier) {
        case 0: return `https://wsrv.nl/?url=${cleanUrl}${cb}&output=png`; // Tier 0: Dedicated Image CDN
        case 1: return `https://corsproxy.io/?${url}`; // Tier 1: Generic CORS Proxy (Excellent for WP)
        case 2: return `https://api.allorigins.win/raw?url=${cleanUrl}`; // Tier 2: Raw data proxy
        default: return url;
      }
    };

    const renderDefaultLogo = (context: CanvasRenderingContext2D) => {
      if (template === TemplateType.MODERN_NEWS) {
        context.fillStyle = '#b91c1c';
        context.fillRect(40, 40, 160, 50);
        context.fillStyle = '#ffffff';
        context.font = 'bold 28px Inter';
        context.textAlign = 'center';
        context.fillText('NEWS', 120, 75);
      } else {
        context.fillStyle = 'rgba(255,255,255,0.2)';
        context.font = '800 32px Inter';
        context.textAlign = 'left';
        context.fillText('NEWSFLOW', 40, 70);
      }
    };

    /**
     * Highly resilient loader that tries multiple proxies and loading methods.
     */
    const loadImageResilient = async (url: string): Promise<HTMLImageElement> => {
      const maxTiers = 4;
      
      for (let tier = 0; tier < maxTiers; tier++) {
        try {
          const src = getProxyTier(url, tier);
          
          // For Tier 1 and 2, try Fetch-to-Blob first as it's more robust
          if (tier === 1 || tier === 2) {
            try {
              const response = await fetch(src);
              if (!response.ok) throw new Error('Fetch failed');
              const blob = await response.blob();
              const blobUrl = URL.createObjectURL(blob);
              return await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = blobUrl;
              });
            } catch (e) {
              console.warn(`Fetch method failed for tier ${tier}, falling back to direct img.src`);
            }
          }

          // Standard img.src loading
          const result = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Tier ${tier} failed`));
            img.src = src;
            // Timeout individual tier
            setTimeout(() => reject(new Error('Timeout')), 6000);
          });
          return result;
        } catch (err) {
          console.warn(`Resilient Load: Tier ${tier} failed for ${url}`);
          continue;
        }
      }
      throw new Error(`All loading tiers failed for: ${url}`);
    };

    const render = async () => {
      const config = TEMPLATE_CONFIGS[template] as any;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Background Image
      try {
        const bgImg = await loadImageResilient(post.featuredImageUrl);
        const scale = Math.max(canvas.width / bgImg.width, canvas.height / bgImg.height);
        const x = (canvas.width / 2) - (bgImg.width / 2) * scale;
        const y = (canvas.height / 2) - (bgImg.height / 2) * scale;
        ctx.drawImage(bgImg, x, y, bgImg.width * scale, bgImg.height * scale);
      } catch (e) {
        console.warn("Background failed. Using fallback.", e);
        ctx.fillStyle = template === TemplateType.MINIMALIST ? '#0f172a' : '#111827';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // 2. Main Layout Content (Templates)
      if (template === TemplateType.MODERN_NEWS) {
        const margin = 35;
        const boxWidth = canvas.width - (margin * 2);
        const boxHeight = 460;
        const rectY = canvas.height - boxHeight - 50;
        
        ctx.fillStyle = '#ffffff';
        const radius = 60;
        ctx.beginPath();
        ctx.moveTo(margin + radius, rectY);
        ctx.lineTo(margin + boxWidth - radius, rectY);
        ctx.quadraticCurveTo(margin + boxWidth, rectY, margin + boxWidth, rectY + radius);
        ctx.lineTo(margin + boxWidth, rectY + boxHeight);
        ctx.lineTo(margin, rectY + boxHeight);
        ctx.lineTo(margin, rectY + radius);
        ctx.quadraticCurveTo(margin, rectY, margin + radius, rectY);
        ctx.closePath();
        ctx.fill();

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
          const isLastLines = lines.length > 2 ? idx >= lines.length - 2 : idx >= 1;
          const hasColon = post.title.includes(':') && l.includes(':');
          if (isLastLines || hasColon) ctx.fillStyle = config.accentColor;
          else ctx.fillStyle = config.textColor;
          ctx.fillText(l, canvas.width / 2, currentTitleY);
          currentTitleY += 90;
        });

        const footerY = canvas.height - 35;
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 32px Inter';
        const siteUrl = (wordpressUrl || 'WORLDNEWSTODAY.LIVE').replace('https://', '').replace('http://', '').toUpperCase();
        
        const iconSize = 28;
        const textMetrics = ctx.measureText(siteUrl);
        const startX = (canvas.width / 2) - (textMetrics.width / 2) - iconSize - 10;
        
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(startX + iconSize/2, footerY - 10, iconSize/2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(startX + iconSize/2, footerY - 10 - iconSize/2);
        ctx.lineTo(startX + iconSize/2, footerY - 10 + iconSize/2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(startX, footerY - 10);
        ctx.lineTo(startX + iconSize, footerY - 10);
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.fillText(siteUrl, startX + iconSize + 15, footerY);

      } else {
        ctx.fillStyle = template === TemplateType.MINIMALIST ? 'rgba(15, 23, 42, 0.92)' : 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (template === TemplateType.BREAKING_NEWS) {
          ctx.fillStyle = config.bgColor;
          ctx.fillRect(0, canvas.height - 300, canvas.width, 110);
          ctx.fillStyle = config.textColor;
          ctx.font = '800 52px Inter';
          ctx.textAlign = 'left';
          ctx.fillText('BREAKING NEWS', 60, canvas.height - 230);
        } else if (template === TemplateType.STANDARD) {
          ctx.fillStyle = config.bgColor;
          ctx.fillRect(60, canvas.height - 320, canvas.width - 120, 8);
        } else if (template === TemplateType.MINIMALIST) {
          ctx.fillStyle = config.accentColor;
          ctx.fillRect(60, canvas.height - 400, 10, 240);
          ctx.font = 'bold 24px Inter';
          ctx.fillStyle = '#94a3b8';
          ctx.textAlign = 'left';
          ctx.fillText(new Date(post.date).toLocaleDateString().toUpperCase(), 60, canvas.height - 430);
        }

        ctx.fillStyle = config.textColor || '#ffffff';
        ctx.font = 'bold 68px Inter';
        ctx.textAlign = 'left';
        const words = post.title.split(' ');
        let line = '';
        let currentY = canvas.height - 160;
        const xOffset = template === TemplateType.MINIMALIST ? 100 : 60;
        const maxWidth = canvas.width - (xOffset + 60);
        const lineHeight = 80;

        const lines: string[] = [];
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line);

        lines.slice(0, 3).reverse().forEach((l, i) => {
          ctx.fillText(l.trim(), xOffset, currentY - (i * lineHeight));
        });
      }

      // 3. Logo placement
      if (logoUrl && logoUrl.trim() !== "") {
        try {
          const logo = await loadImageResilient(logoUrl);
          const logoHeight = 110;
          const logoWidth = (logo.width / logo.height) * logoHeight;
          ctx.drawImage(logo, 40, 40, Math.min(logoWidth, 400), logoHeight);
        } catch (e) {
          console.error("Logo failed all resilient tiers. Using default.", e);
          renderDefaultLogo(ctx);
        }
      } else {
        renderDefaultLogo(ctx);
      }

      // 4. Watermark (Non-Modern templates)
      if (template !== TemplateType.MODERN_NEWS) {
        ctx.fillStyle = template === TemplateType.MINIMALIST ? config.accentColor : 'rgba(255, 255, 255, 0.4)';
        ctx.font = '600 22px Inter';
        ctx.textAlign = 'right';
        ctx.fillText('POWERED BY NEWSFLOW', canvas.width - 60, canvas.height - 60);
      }

      // 5. Final Export
      if (onExport) {
        try {
          const dataUrl = canvas.toDataURL('image/png');
          onExport(dataUrl);
        } catch (exportError) {
          console.error("Export blocked. Canvas tainted.", exportError);
        }
      }
    };

    render();
  }, [post, template, logoUrl, wordpressUrl, onExport]);

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gray-900 border-4 border-white aspect-square w-full">
      <canvas ref={canvasRef} width={1080} height={1080} className="w-full h-full" />
    </div>
  );
};

export default CanvasPreview;
