
import React, { useRef, useEffect } from 'react';
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
  lowDataMode?: boolean;
}

const imageCache: Record<string, HTMLImageElement> = {};

const CanvasPreview: React.FC<CanvasPreviewProps> = ({ 
  post, 
  template, 
  logoUrl, 
  wordpressUrl, 
  brandWebsite, 
  branding, 
  onExport,
  lowDataMode 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let isCancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const getProxySrc = (url: string, attempt: number = 0) => {
      if (!url) return '';
      if (url.startsWith('data:') || url.startsWith('blob:')) return url;
      
      const width = lowDataMode ? 800 : 1200;
      const encodedUrl = encodeURIComponent(url);

      // Multi-stage proxy strategy
      switch(attempt) {
        case 0: return `https://images.weserv.nl/?url=${encodedUrl}&w=${width}&fit=cover&a=attention`;
        case 1: return `https://wsrv.nl/?url=${encodedUrl}&w=${width}&fit=cover`;
        case 2: return `https://corsproxy.io/?${encodedUrl}`;
        default: return url; // Direct fallback
      }
    };

    const loadImageCached = async (url: string): Promise<HTMLImageElement> => {
      if (!url) throw new Error("URL is missing");
      const cacheKey = `${url}_${lowDataMode ? 'low' : 'high'}`;
      if (imageCache[cacheKey]) return imageCache[cacheKey];

      const tryLoad = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => reject();
          img.src = src;
        });
      };

      // Attempt to load through various proxies
      for (let i = 0; i < 4; i++) {
        try {
          const src = getProxySrc(url, i);
          const loadedImg = await tryLoad(src);
          imageCache[cacheKey] = loadedImg;
          return loadedImg;
        } catch (e) {
          if (i === 3) throw new Error(`All load attempts failed for ${url}`);
          continue;
        }
      }
      throw new Error("Failed to load image");
    };

    const render = async () => {
      // Clear canvas for fresh render
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const baseConfig = TEMPLATE_CONFIGS[template] || TEMPLATE_CONFIGS[TemplateType.STANDARD];
      const config = {
        ...baseConfig,
        accentColor: branding?.useCustomColors ? branding.accentColor : baseConfig.accentColor,
        barColor: branding?.useCustomColors ? branding.primaryColor : baseConfig.barColor,
      };

      const handleText = (brandWebsite || wordpressUrl || 'WORLDNEWS.LIVE').toUpperCase();
      const visualHeadline = (post.visualHeadline || post.title).toUpperCase();
      const highlights = (post.highlightWords || []).map(w => w.toUpperCase());

      // 1. Draw Background (Wait for it to ensure it's at the bottom layer)
      try {
        const imgUrl = post.aiImageUrl || post.featuredImageUrl;
        const bgImg = await loadImageCached(imgUrl);
        if (isCancelled) return;
        
        const scale = Math.max(canvas.width / bgImg.width, canvas.height / bgImg.height);
        const x = (canvas.width / 2) - (bgImg.width / 2) * scale;
        const y = (canvas.height / 2) - (bgImg.height / 2) * scale;
        ctx.drawImage(bgImg, x, y, bgImg.width * scale, bgImg.height * scale);
      } catch (e) {
        console.warn("Background load failed, using fallback color", e);
        ctx.fillStyle = config.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // 2. Legibility Overlay
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      if (template === TemplateType.MODERN_NEWS) {
        gradient.addColorStop(0, 'rgba(0,0,0,0.5)');
        gradient.addColorStop(0.3, 'rgba(0,0,0,0)');
        gradient.addColorStop(0.6, 'rgba(255,255,255,0)');
        gradient.addColorStop(1, 'rgba(255,255,255,0.95)');
      } else {
        gradient.addColorStop(0, 'rgba(0,0,0,0.6)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.9)');
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const wrapText = (text: string, x: number, y: number, maxWidth: number, fontSize: number, align: 'center' | 'left') => {
        ctx.font = `900 ${fontSize}px Inter`;
        ctx.textAlign = align;
        const words = text.split(' ');
        let lines = [];
        let currentLine = '';

        for (let n = 0; n < words.length; n++) {
          let testLine = currentLine + words[n] + ' ';
          let metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            lines.push(currentLine.trim());
            currentLine = words[n] + ' ';
          } else {
            currentLine = testLine;
          }
        }
        lines.push(currentLine.trim());

        let curY = y;
        lines.forEach(lineStr => {
          let curX = x;
          if (align === 'center') {
            const lineWidth = ctx.measureText(lineStr).width;
            curX = x - (lineWidth / 2);
          }
          
          lineStr.split(' ').forEach(word => {
            const isHighlighted = highlights.some(h => word.includes(h) || h.includes(word));
            ctx.fillStyle = isHighlighted ? config.accentColor : (template === TemplateType.MODERN_NEWS ? '#111827' : '#FFFFFF');
            
            if (template !== TemplateType.MODERN_NEWS) {
              ctx.shadowColor = 'rgba(0,0,0,0.7)';
              ctx.shadowBlur = 10;
            } else {
              ctx.shadowBlur = 0;
            }

            ctx.textAlign = 'left';
            ctx.fillText(word + ' ', curX, curY);
            curX += ctx.measureText(word + ' ').width;
          });
          curY += fontSize * 1.2;
        });
        return curY;
      };

      // 3. Template Rendering
      if (template === TemplateType.MODERN_NEWS) {
        const margin = 60;
        const boxWidth = canvas.width - (margin * 2);
        const boxY = canvas.height - 420;
        
        ctx.fillStyle = config.barColor;
        ctx.fillRect(0, canvas.height - 110, canvas.width, 110);
        
        wrapText(visualHeadline, canvas.width / 2, boxY, boxWidth, 64, 'center');
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 34px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(handleText, canvas.width / 2, canvas.height - 45);

      } else if (template === TemplateType.BREAKING_NEWS) {
        ctx.fillStyle = config.barColor;
        ctx.fillRect(0, canvas.height - 320, canvas.width, 320);
        
        ctx.fillStyle = config.accentColor;
        ctx.font = '900 44px Inter';
        ctx.textAlign = 'left';
        ctx.fillText('BREAKING NEWS BROADCAST', 70, canvas.height - 240);
        
        wrapText(visualHeadline, 70, canvas.height - 160, canvas.width - 140, 60, 'left');
      } else {
        ctx.fillStyle = config.barColor;
        ctx.fillRect(0, canvas.height - 150, canvas.width, 150);
        wrapText(visualHeadline, 70, canvas.height - 320, canvas.width - 140, 68, 'left');
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 30px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(handleText, canvas.width - 70, canvas.height - 65);
      }

      // 4. Logo Render
      try {
        const logoToUse = (logoUrl && logoUrl.trim() !== "") ? logoUrl : (baseConfig.defaultLogo || APP_LOGO_BASE64);
        const logoImg = await loadImageCached(logoToUse);
        if (isCancelled) return;
        const h = 110;
        const w = (logoImg.width / logoImg.height) * h;
        ctx.drawImage(logoImg, 70, 70, Math.min(w, 450), h);
      } catch (e) {
        console.warn("Logo load failed", e);
      }

      if (onExport && !isCancelled) onExport(canvas.toDataURL('image/png', 0.95));
    };

    render();
    return () => { isCancelled = true; };
  }, [post.id, post.aiImageUrl, post.featuredImageUrl, post.visualHeadline, template, logoUrl, brandWebsite, onExport]);

  return (
    <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-slate-100 border-4 border-white aspect-square w-full">
      <canvas ref={canvasRef} width={1080} height={1080} className="w-full h-full object-contain" />
    </div>
  );
};

export default CanvasPreview;
