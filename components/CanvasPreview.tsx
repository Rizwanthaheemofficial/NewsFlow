
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

    /**
     * Image Loading Pipeline (CORS Safe)
     */
    const getProxySrc = (url: string) => {
      if (!url) return '';
      if (url.startsWith('data:') || url.startsWith('blob:')) return url;
      const width = lowDataMode ? 600 : 1080;
      return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=${width}&fit=cover&a=attention`;
    };

    const getSecondaryProxySrc = (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const getPlaceholderSrc = (query: string = 'news') => `https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1080&q=80&sig=${encodeURIComponent(query.substring(0, 30))}`;

    const loadImageCached = async (url: string): Promise<HTMLImageElement> => {
      if (!url) throw new Error("URL is missing");
      const cacheKey = `${url}_${lowDataMode ? 'low' : 'high'}`;
      if (imageCache[cacheKey]) return imageCache[cacheKey];

      const tryLoad = (src: string): Promise<HTMLImageElement> => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        return new Promise((resolve, reject) => {
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`Load failed: ${src}`));
          img.src = src;
        });
      };

      try {
        const img = await tryLoad(getProxySrc(url));
        imageCache[cacheKey] = img;
        return img;
      } catch (e1) {
        try {
          const img = await tryLoad(getSecondaryProxySrc(url));
          imageCache[cacheKey] = img;
          return img;
        } catch (e2) {
          const img = await tryLoad(getPlaceholderSrc(post.title));
          imageCache[cacheKey] = img;
          return img;
        }
      }
    };

    const render = async () => {
      const baseConfig = TEMPLATE_CONFIGS[template] || TEMPLATE_CONFIGS[TemplateType.STANDARD];
      const config = {
        ...baseConfig,
        accentColor: branding?.useCustomColors ? branding.accentColor : baseConfig.accentColor,
        barColor: branding?.useCustomColors ? branding.primaryColor : baseConfig.barColor,
      };

      const handleText = (brandWebsite || wordpressUrl || 'WORLDNEWSTODAY.LIVE').toUpperCase();
      const visualHeadline = (post.visualHeadline || post.title).toUpperCase();
      const highlights = (post.highlightWords || []).map(w => w.toUpperCase());

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      try {
        const imgUrl = post.aiImageUrl || post.featuredImageUrl;
        const bgImg = await loadImageCached(imgUrl);
        if (isCancelled) return;
        const scale = Math.max(canvas.width / bgImg.width, canvas.height / bgImg.height);
        const x = (canvas.width / 2) - (bgImg.width / 2) * scale;
        const y = (canvas.height / 2) - (bgImg.height / 2) * scale;
        ctx.drawImage(bgImg, x, y, bgImg.width * scale, bgImg.height * scale);
      } catch (e) {
        ctx.fillStyle = config.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (isCancelled) return;

      /**
       * Catchy Text Rendering Helper
       */
      const drawHeadline = (text: string, x: number, y: number, maxWidth: number, align: 'center' | 'left', fontSize: number) => {
        ctx.textAlign = align;
        ctx.font = `900 ${fontSize}px Inter`;
        const words = text.split(' ');
        let lines: string[] = [];
        let line = '';
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

        let currentY = y;
        lines.forEach((l) => {
          const wordsInLine = l.split(' ');
          let currentX = x;
          
          if (align === 'center') {
            const lineWidth = ctx.measureText(l).width;
            currentX = x - (lineWidth / 2);
          }

          wordsInLine.forEach((w) => {
            const isHighlighted = highlights.some(h => w.includes(h) || h.includes(w));
            ctx.fillStyle = isHighlighted ? config.accentColor : (template === TemplateType.MODERN_NEWS ? '#111827' : '#ffffff');
            
            // Text legibility enhancement for dark/light backgrounds
            if (template !== TemplateType.MODERN_NEWS) {
              ctx.shadowColor = 'rgba(0,0,0,0.8)';
              ctx.shadowBlur = 10;
              ctx.shadowOffsetX = 2;
              ctx.shadowOffsetY = 2;
            } else {
              ctx.shadowBlur = 0;
              ctx.shadowOffsetX = 0;
              ctx.shadowOffsetY = 0;
            }

            ctx.textAlign = 'left';
            ctx.fillText(w + ' ', currentX, currentY);
            currentX += ctx.measureText(w + ' ').width;
          });
          currentY += fontSize * 1.1;
        });
        return currentY;
      };

      if (template === TemplateType.MODERN_NEWS) {
        const margin = 40;
        const boxWidth = canvas.width - (margin * 2);
        const boxHeight = 440;
        const rectY = canvas.height - boxHeight - 60;
        
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 30;
        ctx.fillRect(margin, rectY, boxWidth, boxHeight);
        ctx.shadowBlur = 0;

        ctx.fillStyle = config.barColor;
        ctx.fillRect(0, canvas.height - 90, canvas.width, 90);
        
        ctx.strokeStyle = config.barColor;
        ctx.lineWidth = 16;
        ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
        
        drawHeadline(visualHeadline, canvas.width / 2, rectY + 120, boxWidth - 80, 'center', 72);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 36px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(handleText, canvas.width / 2, canvas.height - 35);

      } else if (template === TemplateType.BREAKING_NEWS) {
        ctx.fillStyle = `rgba(220, 38, 38, 0.75)`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Slanted Graphic Bar
        ctx.fillStyle = config.barColor;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height - 280);
        ctx.lineTo(canvas.width, canvas.height - 340);
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.fill();

        ctx.fillStyle = config.accentColor;
        ctx.font = '900 52px Inter';
        ctx.textAlign = 'left';
        ctx.fillText('BREAKING NEWS', 60, canvas.height - 220);
        
        drawHeadline(visualHeadline, 60, canvas.height - 130, canvas.width - 120, 'left', 68);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 24px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(handleText, canvas.width - 60, canvas.height - 220);

      } else if (template === TemplateType.MINIMALIST) {
        ctx.fillStyle = `rgba(15, 23, 42, 0.4)`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = config.accentColor;
        ctx.fillRect(0, 0, 12, canvas.height);
        
        drawHeadline(visualHeadline, 80, 400, canvas.width - 160, 'left', 84);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 24px Inter';
        ctx.textAlign = 'left';
        ctx.fillText(handleText, 80, canvas.height - 80);

      } else {
        // Standard Layout
        ctx.fillStyle = `rgba(0, 0, 0, 0.55)`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = config.barColor;
        ctx.fillRect(0, canvas.height - 110, canvas.width, 110);
        
        drawHeadline(visualHeadline, 60, canvas.height - 260, canvas.width - 120, 'left', 74);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 32px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(handleText, canvas.width / 2, canvas.height - 45);
      }

      if (isCancelled) return;

      // Brand Logo
      try {
        const logoToUse = (logoUrl && logoUrl.trim() !== "") ? logoUrl : (baseConfig.defaultLogo || APP_LOGO_BASE64);
        const logo = await loadImageCached(logoToUse);
        if (isCancelled) return;
        const logoHeight = template === TemplateType.MINIMALIST ? 90 : 130;
        const logoWidth = (logo.width / logo.height) * logoHeight;
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 20;
        if (template === TemplateType.MINIMALIST) {
          ctx.drawImage(logo, canvas.width - logoWidth - 60, 60, logoWidth, logoHeight);
        } else {
          ctx.drawImage(logo, 50, 50, Math.min(logoWidth, 450), logoHeight);
        }
        ctx.restore();
      } catch (e) {}

      if (onExport && !isCancelled) onExport(canvas.toDataURL('image/png'));
    };

    render();
    return () => { isCancelled = true; };
  }, [post, template, logoUrl, wordpressUrl, brandWebsite, branding, onExport, lowDataMode]);

  return (
    <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-slate-900 border-4 border-white aspect-square w-full transition-transform hover:scale-[1.01] duration-500">
      <canvas ref={canvasRef} width={1080} height={1080} className="w-full h-full" />
    </div>
  );
};

export default CanvasPreview;
