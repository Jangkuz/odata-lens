/**
 * URL hash state management for shareable queries.
 * Encodes/decodes query state to/from base64url in location.hash
 */

/**
 * Encode query text to base64url for use in URL hash.
 */
export function encodeHashState(text: string): string {
  const encoded = btoa(text)
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Decode base64url from hash back to query text.
 */
export function decodeHashState(hash: string): string {
  try {
    const padded = hash.replace(/-/g, '+').replace(/_/g, '/')
    // Add padding if needed
    const padding = padded.length % 4 ? '='.repeat(4 - (padded.length % 4)) : ''
    const decoded = atob(padded + padding)
    return decoded
  } catch {
    return ''
  }
}

/**
 * Get query from current URL hash.
 */
export function getHashQuery(): string {
  const hash = window.location.hash.slice(1)
  return decodeHashState(hash)
}

/**
 * Update URL hash with encoded query.
 */
export function setHashQuery(text: string): void {
  const encoded = encodeHashState(text)
  window.history.replaceState(null, '', `#${encoded}`)
}

/**
 * Listen for hash changes (e.g., back button, sharing link).
 */
export function onHashChange(callback: (text: string) => void): () => void {
  const handler = () => {
    const text = getHashQuery()
    if (text) {
      callback(text)
    }
  }

  window.addEventListener('hashchange', handler)
  return () => window.removeEventListener('hashchange', handler)
}
