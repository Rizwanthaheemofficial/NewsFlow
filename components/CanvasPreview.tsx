
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

/**
 * TEXT ENGINE: Advanced text wrapping with dynamic word-level highlighting
 */
const drawWrappedText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  align: 'center' | 'left' | 'right',
  highlights: string[],
  accentColor: string,
  baseTextColor: string
) => {
  ctx.font = `900 ${fontSize}px Inter`;
  ctx.textAlign = align;
  
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (let n = 0; n < words.length; n++) {
    const testLine = currentLine + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
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
    const lineWidth = ctx.measureText(lineStr).width;

    if (align === 'center') curX = x - (lineWidth / 2);
    else if (align === 'right') curX = x - lineWidth;

    lineStr.split(' ').forEach(word => {
      const isHighlighted = highlights.some(h => 
        word.toLowerCase().includes(h.toLowerCase()) || 
        h.toLowerCase().includes(word.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())
      );
      
      ctx.fillStyle = isHighlighted ? accentColor : baseTextColor;
      ctx.textAlign = 'left';
      ctx.fillText(word + ' ', curX, curY);
      curX += ctx.measureText(word + ' ').width;
    });
    curY += fontSize * 1.2;
  });
  return curY;
};

/**
 * TEMPLATE DRIVERS: Modular rendering strategies for each template type
 */
const TEMPLATE_DRIVERS: Record<TemplateType, (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, config: any, data: { headline: string, handle: string, highlights: string[] }) => void> = {
  [TemplateType.MODERN_NEWS]: (ctx, canvas, config, { headline, handle, highlights }) => {
    // 1. Specialized Gradient for Modern Light/Dark contrast
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, 'rgba(0,0,0,0.4)');
    grad.addColorStop(0.3, 'rgba(0,0,0,0)');
    grad.addColorStop(0.7, 'rgba(255,255,255,0)');
    grad.addColorStop(1, 'rgba(255,255,255,0.95)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Graphics
    ctx.fillStyle = config.barColor;
    ctx.fillRect(0, canvas.height - 110, canvas.width, 110);
    drawWrappedText(ctx, headline, canvas.width / 2, canvas.height - 400, canvas.width - 120, 64, 'center', highlights, config.accentColor, '#111827');
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 34px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(handle, canvas.width / 2, canvas.height - 45);
  },

  [TemplateType.BREAKING_NEWS]: (ctx, canvas, config, { headline, highlights }) => {
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, 'rgba(0,0,0,0.5)');
    grad.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = config.barColor;
    ctx.fillRect(0, canvas.height - 300, canvas.width, 300);
    
    ctx.fillStyle = config.accentColor;
    ctx.font = '900 40px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('LIVE BROADCAST', 70, canvas.height - 230);
    
    drawWrappedText(ctx, headline, 70, canvas.height - 160, canvas.width - 140, 60, 'left', highlights, config.accentColor, '#FFFFFF');
  },

  [TemplateType.MINIMALIST]: (ctx, canvas, config, { headline, handle, highlights }) => {
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, 'rgba(0,0,0,0.5)');
    grad.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = config.barColor;
    ctx.fillRect(0, canvas.height - 150, canvas.width, 150);
    
    drawWrappedText(ctx, headline, 70, canvas.height - 320, canvas.width - 140, 68, 'left', highlights, config.accentColor, '#FFFFFF');
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 30px Inter';
    ctx.textAlign = 'right';
    ctx.fillText(handle, canvas.width - 70, canvas.height - 65);
  },

  [TemplateType.STANDARD]: (ctx, canvas, config, { headline, handle, highlights }) => {
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, 'rgba(0,0,0,0.5)');
    grad.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = config.barColor;
    ctx.fillRect(0, canvas.height - 150, canvas.width, 150);
    
    drawWrappedText(ctx, headline, 70, canvas.height - 320, canvas.width - 140, 68, 'left', highlights, config.accentColor, '#FFFFFF');
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 30px Inter';
    ctx.textAlign = 'right';
    ctx.fillText(handle, canvas.width - 70, canvas.height - 65);
  }
};

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

    const loadImageCached = async (url: string): Promise<HTMLImageElement> => {
      if (!url) throw new Error("URL is missing");
      const cacheKey = `${url}_${lowDataMode ? 'low' : 'high'}`;
      if (imageCache[cacheKey]) return imageCache[cacheKey];

      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          imageCache[cacheKey] = img;
          resolve(img);
        };
        img.onerror = () => reject();
        img.src = url.startsWith('data:') ? url : `https://images.weserv.nl/?url=${encodeURIComponent(url)}&fit=contain`;
      });
    };

    const render = async () => {
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

      // 1. Draw Background
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

      // 2. Execute Template Rendering Strategy
      const driver = TEMPLATE_DRIVERS[template] || TEMPLATE_DRIVERS[TemplateType.STANDARD];
      driver(ctx, canvas, config, { 
        headline: visualHeadline, 
        handle: handleText, 
        highlights 
      });

      // 3. Render Brand Identity
      try {
        const logoToUse = (logoUrl && logoUrl.trim() !== "") ? logoUrl : APP_LOGO_BASE64;
        const logoImg = await loadImageCached(logoToUse);
        if (isCancelled) return;
        
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;

        if (config.logoFilter && config.logoFilter !== 'none') {
            ctx.filter = config.logoFilter;
        }

        const h = 110;
        const w = (logoImg.width / logoImg.height) * h;
        const finalW = Math.min(w, 450);
        
        ctx.drawImage(logoImg, 70, 70, finalW, h);
        ctx.restore();
      } catch (e) {
        console.warn("Logo rendering skipped", e);
      }

      if (onExport && !isCancelled) onExport(canvas.toDataURL('image/png', 0.95));
    };

    render();
    return () => { isCancelled = true; };
  }, [post.id, post.aiImageUrl, post.featuredImageUrl, post.visualHeadline, template, logoUrl, brandWebsite, onExport, branding]);

  return (
    <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-slate-100 border-4 border-white aspect-square w-full">
      <canvas ref={canvasRef} width={1080} height={1080} className="w-full h-full object-contain" />
    </div>
  );
};

export default CanvasPreview;
