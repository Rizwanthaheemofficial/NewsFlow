
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
        // Use a proxy to avoid CORS issues for custom logos
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

      // 2. Overlay Gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      if (template === TemplateType.MODERN_NEWS) {
        gradient.addColorStop(0, 'rgba(0,0,0,0.4)');
        gradient.addColorStop(0.3, 'rgba(0,0,0,0)');
        gradient.addColorStop(0.7, 'rgba(255,255,255,0)');
        gradient.addColorStop(1, 'rgba(255,255,255,0.95)');
      } else {
        gradient.addColorStop(0, 'rgba(0,0,0,0.5)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.85)');
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
            ctx.textAlign = 'left';
            ctx.fillText(word + ' ', curX, curY);
            curX += ctx.measureText(word + ' ').width;
          });
          curY += fontSize * 1.2;
        });
        return curY;
      };

      // 3. Render Template Specifics
      if (template === TemplateType.MODERN_NEWS) {
        ctx.fillStyle = config.barColor;
        ctx.fillRect(0, canvas.height - 110, canvas.width, 110);
        wrapText(visualHeadline, canvas.width / 2, canvas.height - 400, canvas.width - 120, 64, 'center');
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 34px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(handleText, canvas.width / 2, canvas.height - 45);
      } else if (template === TemplateType.BREAKING_NEWS) {
        ctx.fillStyle = config.barColor;
        ctx.fillRect(0, canvas.height - 300, canvas.width, 300);
        ctx.fillStyle = config.accentColor;
        ctx.font = '900 40px Inter';
        ctx.fillText('LIVE BROADCAST', 70, canvas.height - 230);
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

      // 4. Enhanced Logo Rendering (Transparency Support)
      try {
        const logoToUse = (logoUrl && logoUrl.trim() !== "") ? logoUrl : APP_LOGO_BASE64;
        const logoImg = await loadImageCached(logoToUse);
        if (isCancelled) return;
        
        ctx.save();
        
        // Mechanism for Visibility: Add a subtle glow/shadow for transparent logos
        // This ensures a dark transparent logo is visible on a dark background
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;

        // Apply template filters (e.g. Invert for Minimalist)
        if (config.logoFilter && config.logoFilter !== 'none') {
            ctx.filter = config.logoFilter;
        }

        const h = 110;
        const w = (logoImg.width / logoImg.height) * h;
        const maxW = 450;
        const finalW = Math.min(w, maxW);
        
        // Center vertically in the top padding
        ctx.drawImage(logoImg, 70, 70, finalW, h);
        
        ctx.restore();
      } catch (e) {
        console.warn("Logo skipped", e);
      }

      if (onExport && !isCancelled) onExport(canvas.toDataURL('image/png', 0.95));
    };

    render();
    return () => { isCancelled = true; };
  }, [post.id, post.aiImageUrl, post.featuredImageUrl, post.visualHeadline, template, logoUrl, brandWebsite, onExport, branding]);

  return (
    <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-slate-100 border-4 border-white aspect-square w-full group">
      <canvas ref={canvasRef} width={1080} height={1080} className="w-full h-full object-contain" />
    </div>
  );
};

export default CanvasPreview;
