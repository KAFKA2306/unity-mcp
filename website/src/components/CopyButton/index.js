import React, { useState, useRef, useEffect } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

export default function CopyButton({ text, label, className }) {
  const { i18n } = useDocusaurusContext();
  const ja = i18n.currentLocale !== 'en';
  const effectiveLabel = label ?? (ja ? '内容' : 'content');
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const onClick = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // The rendered text remains selectable when clipboard access fails.
    }
  };

  const ariaLabel = copied
    ? (ja ? 'クリップボードにコピーしました' : 'Copied to clipboard')
    : (ja ? `${effectiveLabel}をクリップボードにコピー` : `Copy ${effectiveLabel} to clipboard`);

  return (
    <button
      type="button"
      className={`${styles.copy} ${copied ? styles.copied : ''} ${className ?? ''}`.trim()}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <span className={styles.icon} aria-hidden="true">
        {copied ? (
          <svg viewBox="0 0 16 16" width="13" height="13">
            <path d="M2 8.5 L6.5 13 L14 4" stroke="currentColor" strokeWidth="2"
                  fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" width="13" height="13">
            <rect x="4.5" y="4.5" width="9" height="9" rx="1.5"
                  stroke="currentColor" strokeWidth="1.5" fill="none" />
            <rect x="2.5" y="2.5" width="9" height="9" rx="1.5"
                  stroke="currentColor" strokeWidth="1.5" fill="none"
                  style={{ opacity: 0.55 }} />
          </svg>
        )}
      </span>
      <span className={styles.label}>{copied ? (ja ? 'コピー済み' : 'Copied') : (ja ? 'コピー' : 'Copy')}</span>
    </button>
  );
}
