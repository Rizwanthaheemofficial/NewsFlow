
import React, { useRef, useEffect, useState } from 'react';
import { TemplateType, WPPost, BrandingConfig } from '../types';
import { TEMPLATE_CONFIGS, APP_LOGO_BASE64 } from '../constants';

interface CanvasPreviewProps {
  post: WPPost;
  template: TemplateType;
  logoUrl?: string;
  wordpressUrl?: string;
  brandWebsite?: string;
  branding?: BrandingConfig;
  onExport?: (dataUrl: string) => void;
}

// Global cache to prevent re-fetching/re-loading same images during template switches
const imageCache: Record<string, HTMLImageElement> = {};

const CanvasPreview: React.FC<CanvasPreviewProps> = ({ post, template, logoUrl, wordpressUrl, brandWebsite, branding, onExport }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const getProxySrc = (url: string) => {
      if (url.startsWith('data:')) return url;
      return `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=png&cb=${Date.now()}`;
    };

    const loadImageCached = async (url: string): Promise<HTMLImageElement> => {
      if (!url) throw new Error("URL is missing");
      if (imageCache[url]) return imageCache[url];

      const img = new Image();
      img.crossOrigin = "anonymous";
      return new Promise((resolve, reject) => {
        img.onload = () => {
          imageCache[url] = img;
          resolve(img);
        };
        img.onerror = () => reject(new Error("Image failed to load"));
        img.src = getProxySrc(url);
      });
    };

    const render = async () => {
      const baseConfig = TEMPLATE_CONFIGS[template] || TEMPLATE_CONFIGS[TemplateType.STANDARD];
      
      const config = {
        ...baseConfig,
        accentColor: branding?.useCustomColors ? branding.accentColor : baseConfig.accentColor,
        barColor: branding?.useCustomColors ? branding.primaryColor : baseConfig.barColor,
      };

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Background
      try {
        const bgImg = await loadImageCached(post.featuredImageUrl);
        const scale = Math.max(canvas.width / bgImg.width, canvas.height / bgImg.height);
        const x = (canvas.width / 2) - (bgImg.width / 2) * scale;
        const y = (canvas.height / 2) - (bgImg.height / 2) * scale;
        ctx.drawImage(bgImg, x, y, bgImg.width * scale, bgImg.height * scale);
      } catch (e) {
        ctx.fillStyle = config.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // 2. Apply Template Overlays
      if (template === TemplateType.MODERN_NEWS) {
        const margin = 35;
        const boxWidth = canvas.width - (margin * 2);
        const boxHeight = 460;
        const rectY = canvas.height - boxHeight - 50;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(margin, rectY, boxWidth, boxHeight);

        ctx.fillStyle = config.barColor;
        ctx.fillRect(0, canvas.height - 85, canvas.width, 85);

        ctx.strokeStyle = branding?.useCustomColors ? branding.primaryColor : '#ffffff';
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
          if (ctx.measureText(testLine).width > maxWidth && n > 0) {
            lines.push(line.trim());
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line.trim());

        let currentTitleY = rectY + 115;
        lines.forEach((l, idx) => {
          ctx.fillStyle = (idx >= lines.length - 1) ? config.accentColor : '#111827';
          ctx.fillText(l, canvas.width / 2, currentTitleY);
          currentTitleY += 90;
        });

        ctx.fillStyle = '#ffffff';
        ctx.font = '800 32px Inter';
        ctx.fillText((brandWebsite || wordpressUrl || 'WORLDNEWSTODAY.LIVE').toUpperCase(), canvas.width / 2, canvas.height - 35);

      } else if (template === TemplateType.MINIMALIST) {
        ctx.fillStyle = `rgba(255, 255, 255, ${config.overlayOpacity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = config.barColor;
        ctx.fillRect(0, 0, 15, canvas.height);

        ctx.fillStyle = '#0f172a';
        ctx.font = '800 72px Inter';
        ctx.textAlign = 'left';
        
        const words = post.title.split(' ');
        let line = '';
        let currentY = 320;
        const maxWidth = canvas.width - 160;

        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          if (ctx.measureText(testLine).width > maxWidth && n > 0) {
            ctx.fillStyle = '#0f172a';
            ctx.fillText(line.trim(), 80, currentY);
            currentY += 90;
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
        ctx.fillStyle = config.accentColor;
        ctx.fillText(line.trim(), 80, currentY);

      } else if (template === TemplateType.BREAKING_NEWS) {
        ctx.fillStyle = `rgba(220, 38, 38, ${config.overlayOpacity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = config.barColor;
        ctx.fillRect(0, canvas.height - 240, canvas.width, 240);

        ctx.fillStyle = config.accentColor;
        ctx.font = '900 48px Inter';
        ctx.fillText('BREAKING NEWS', 60, canvas.height - 170);

        ctx.fillStyle = '#ffffff';
        ctx.font = '800 64px Inter';
        const words = post.title.split(' ');
        let line = '';
        let currentY = canvas.height - 80;
        const lines: string[] = [];
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          if (ctx.measureText(testLine).width > canvas.width - 120 && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line);
        lines.slice(0, 2).reverse().forEach((l, i) => {
           ctx.fillText(l.trim(), 60, currentY - (i * 75));
        });
      } else {
        ctx.fillStyle = `rgba(0, 0, 0, ${config.overlayOpacity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (branding?.useCustomColors) {
            ctx.strokeStyle = config.barColor;
            ctx.lineWidth = 20;
            ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 68px Inter';
        ctx.textAlign = 'left';
        const words = post.title.split(' ');
        let line = '';
        let currentY = canvas.height - 150;
        const lines: string[] = [];
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          if (ctx.measureText(testLine).width > canvas.width - 120 && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line);
        lines.reverse().forEach((l, i) => {
          ctx.fillStyle = (i === 0) ? config.accentColor : '#ffffff';
          ctx.fillText(l.trim(), 60, currentY - (i * 85));
        });
      }

      // 3. Draw Logo
      try {
        const logoToUse = (logoUrl && logoUrl.trim() !== "") 
          ? logoUrl 
          : (config.defaultLogo || APP_LOGO_BASE64);

        const logo = await loadImageCached(logoToUse);
        
        const logoHeight = template === TemplateType.MINIMALIST ? 80 : 120;
        const logoWidth = (logo.width / logo.height) * logoHeight;
        const padding = 20;

        if (template === TemplateType.MINIMALIST) {
          ctx.drawImage(logo, canvas.width - logoWidth - 60, 60, logoWidth, logoHeight);
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
          ctx.fillRect(40 - padding, 40 - padding, Math.min(logoWidth, 400) + (padding * 2), logoHeight + (padding * 2));
          ctx.drawImage(logo, 40, 40, Math.min(logoWidth, 400), logoHeight);
        }
      } catch (e) {}

      if (onExport) onExport(canvas.toDataURL('image/png'));
    };

    render();
  }, [post, template, logoUrl, wordpressUrl, brandWebsite, branding, onExport]);

  return (
    <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-gray-900 border-4 border-white aspect-square w-full">
      <canvas ref={canvasRef} width={1080} height={1080} className="w-full h-full" />
    </div>
  );
};

export default CanvasPreview;
