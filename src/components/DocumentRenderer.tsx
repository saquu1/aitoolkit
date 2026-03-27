'use client';

import { useMemo } from 'react';

interface DocumentRendererProps {
  content: string;
  type: 'docs' | 'uat' | 'prisma' | 'markdown';
  className?: string;
}

/**
 * Simple markdown to HTML converter
 */
function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-white mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-white mt-6 mb-3 border-b border-slate-600 pb-2">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-white mt-6 mb-4">$1</h1>');

  // Bold and Italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="font-bold text-white"><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
  html = html.replace(/__(.*?)__/g, '<strong class="font-semibold text-white">$1</strong>');
  html = html.replace(/_(.*?)_/g, '<em class="italic">$1</em>');

  // Code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="bg-slate-900 rounded-lg p-4 overflow-x-auto my-4 border border-slate-700"><code class="text-sm text-slate-300 font-mono">${escapeHtml(code.trim())}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-700 px-1.5 py-0.5 rounded text-sm text-purple-300 font-mono">$1</code>');

  // Tables
  html = html.replace(/^\|(.+)\|\s*\n\|[-:\s|]+\|\s*\n((?:\|.+\|\s*\n?)+)/gm, (match, header, body) => {
    const headers = header.split('|').filter((h: string) => h.trim()).map((h: string) => 
      `<th class="px-4 py-2 text-left text-slate-300 font-medium border-b border-slate-600">${h.trim()}</th>`
    ).join('');
    
    const rows = body.trim().split('\n').map((row: string) => {
      const cells = row.split('|').filter((c: string) => c.trim()).map((c: string) =>
        `<td class="px-4 py-2 text-slate-400 border-b border-slate-700">${c.trim()}</td>`
      ).join('');
      return `<tr class="hover:bg-slate-800/50">${cells}</tr>`;
    }).join('');

    return `<div class="overflow-x-auto my-4"><table class="w-full border-collapse"><thead><tr class="bg-slate-800">${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
  });

  // Lists
  html = html.replace(/^\s*[-*]\s+(.*)$/gm, '<li class="text-slate-300 ml-4 list-disc">$1</li>');
  html = html.replace(/^\s*\d+\.\s+(.*)$/gm, '<li class="text-slate-300 ml-4 list-decimal">$1</li>');

  // Wrap consecutive list items
  html = html.replace(/(<li class="text-slate-300 ml-4 list-disc">[\s\S]*?<\/li>\n?)+/g, (match) => {
    return `<ul class="my-2 space-y-1">${match}</ul>`;
  });
  html = html.replace(/(<li class="text-slate-300 ml-4 list-decimal">[\s\S]*?<\/li>\n?)+/g, (match) => {
    return `<ol class="my-2 space-y-1">${match}</ol>`;
  });

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr class="border-slate-600 my-6" />');

  // Blockquotes
  html = html.replace(/^>\s+(.*)$/gm, '<blockquote class="border-l-4 border-indigo-500 pl-4 my-3 text-slate-400 italic">$1</blockquote>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-indigo-400 hover:text-indigo-300 underline" target="_blank" rel="noopener">$1</a>');

  // Paragraphs (wrap remaining lines)
  html = html.split('\n\n').map(block => {
    if (block.match(/^<(h[1-6]|ul|ol|pre|table|div|blockquote|hr)/)) {
      return block;
    }
    if (block.trim()) {
      return `<p class="text-slate-300 my-2 leading-relaxed">${block}</p>`;
    }
    return block;
  }).join('\n');

  return html;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Format Prisma schema with syntax highlighting
 */
function formatPrisma(content: string): string {
  let html = escapeHtml(content);

  // Keywords
  const keywords = ['model', 'enum', 'type', 'generator', 'datasource', 'field', 'fields', 'references', 'onDelete', 'onUpdate', 'map'];
  keywords.forEach(kw => {
    const regex = new RegExp(`\\b(${kw})\\b`, 'g');
    html = html.replace(regex, '<span class="text-purple-400">$1</span>');
  });

  // Types
  const types = ['String', 'Int', 'BigInt', 'Float', 'Decimal', 'Boolean', 'DateTime', 'Json', 'Bytes', 'Int[]', 'String[]'];
  types.forEach(t => {
    const regex = new RegExp(`\\b(${t})\\b`, 'g');
    html = html.replace(regex, '<span class="text-blue-400">$1</span>');
  });

  // Attributes
  html = html.replace(/(@@?\w+)/g, '<span class="text-amber-400">$1</span>');
  
  // Strings
  html = html.replace(/"([^"]*)"/g, '<span class="text-emerald-400">"$1"</span>');

  // Braces
  html = html.replace(/(\{|\})/g, '<span class="text-slate-400 font-bold">$1</span>');

  return html;
}

/**
 * Render UAT test cases
 */
function formatUAT(content: string): string {
  let html = content;

  // Test case ID badge
  html = html.replace(/(TC-\d+)/g, '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">$1</span>');

  // Priority badges
  html = html.replace(/\*\*(High|Critical)\*\*/gi, '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">$1</span>');
  html = html.replace(/\*\*(Medium)\*\*/gi, '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">$1</span>');
  html = html.replace(/\*\*(Low)\*\*/gi, '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">$1</span>');

  // Apply standard markdown after UAT-specific formatting
  return markdownToHtml(html);
}

export function DocumentRenderer({ content, type, className = '' }: DocumentRendererProps) {
  const renderedContent = useMemo(() => {
    switch (type) {
      case 'prisma':
        return `<pre class="bg-slate-900 rounded-lg p-4 overflow-auto text-sm font-mono border border-slate-700"><code>${formatPrisma(content)}</code></pre>`;
      case 'uat':
        return `<div class="uat-content space-y-4">${formatUAT(content)}</div>`;
      case 'docs':
      case 'markdown':
      default:
        return `<div class="prose prose-invert max-w-none">${markdownToHtml(content)}</div>`;
    }
  }, [content, type]);

  return (
    <div 
      className={`document-renderer ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  );
}

export default DocumentRenderer;
