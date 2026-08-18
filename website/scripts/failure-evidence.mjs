export function sourceDomain(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new TypeError(`unsupported evidence URL protocol: ${url.protocol}`);
  }
  return url.hostname.toLowerCase();
}

export function githubRepository(value) {
  const url = new URL(value);
  if (url.hostname.toLowerCase() !== 'github.com') return null;
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length < 2) return null;
  return `${segments[0]}/${segments[1]}`;
}
