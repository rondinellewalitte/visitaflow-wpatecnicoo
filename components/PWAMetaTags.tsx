'use client';

import { useEffect } from 'react';

/**
 * Componente para adicionar meta tags específicas do PWA para iOS
 * Usado porque algumas meta tags não podem ser definidas via metadata export do Next.js
 */
export default function PWAMetaTags() {
  useEffect(() => {
    // Adiciona meta tags para iOS se ainda não existirem
    const addMetaTag = (name: string, content: string) => {
      const existing = document.querySelector(`meta[name="${name}"]`);
      if (!existing) {
        const meta = document.createElement('meta');
        meta.name = name;
        meta.content = content;
        document.head.appendChild(meta);
      }
    };

    addMetaTag('apple-mobile-web-app-capable', 'yes');
    addMetaTag('apple-mobile-web-app-status-bar-style', 'default');
    addMetaTag('apple-mobile-web-app-title', 'VisitaFlow Técnico');
    addMetaTag('theme-color', '#16a34a');
  }, []);

  return null;
}

