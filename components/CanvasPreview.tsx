
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

    // Helper to bypass CORS issues for any external image
    const getProxiedUrl = (url: string) => {
      if (!url) return '';
      // If it's already a data URL or local, don't proxy
      if (url.startsWith('data:') || url.startsWith('blob:') || url.includes(window.location.host)) return url;
      // Use a public CORS proxy for external assets to prevent tainted canvas
      return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
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

    const render = async () => {
      const config = TEMPLATE_CONFIGS[template] as any;
      
      // 1. Draw Background Image (Using proxy to avoid tainting)
      const img = new Image();
      // Even with proxy, setting crossOrigin is good practice
      img.crossOrigin = "anonymous";
      img.src = getProxiedUrl(post.featuredImageUrl);
      
      try {
        await new Promise((resolve, reject) => { 
          img.onload = resolve; 
          img.onerror = reject;
          setTimeout(() => reject(new Error("BG Timeout")), 8000);
        });
      } catch (e) {
        console.warn("Background image failed even with proxy. Using fallback color.");
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (img.complete && img.naturalWidth > 0) {
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width / 2) - (img.width / 2) * scale;
        const y = (canvas.height / 2) - (img.height / 2) * scale;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      } else {
        ctx.fillStyle = template === TemplateType.MINIMALIST ? '#0f172a' : '#111827';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // 2. Main Layout Content
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

      // 3. Logo placement with Proxy Bypass Logic
      if (logoUrl && logoUrl.trim() !== "") {
        try {
          const logo = new Image();
          logo.crossOrigin = "anonymous";
          logo.src = getProxiedUrl(logoUrl);
          
          await new Promise((resolve, reject) => { 
            logo.onload = resolve; 
            logo.onerror = reject;
            setTimeout(() => reject(new Error("Logo Timeout")), 5000);
          });

          const logoHeight = 110;
          const logoWidth = (logo.width / logo.height) * logoHeight;
          ctx.drawImage(logo