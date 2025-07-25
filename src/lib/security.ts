import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param content - The HTML content to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(content: string): string {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    FORBID_SCRIPT: true,
    FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit']
  });
}

/**
 * Sanitizes plain text content to prevent XSS
 * @param content - The text content to sanitize
 * @returns Sanitized text string
 */
export function sanitizeText(content: string): string {
  return DOMPurify.sanitize(content, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

/**
 * Validates and sanitizes article slugs to prevent path traversal
 * @param slug - The article slug to validate
 * @returns Sanitized slug or null if invalid
 */
export function validateSlug(slug: string): string | null {
  // Only allow alphanumeric characters, hyphens, and underscores
  const slugPattern = /^[a-zA-Z0-9_-]+$/;
  
  if (!slug || slug.length > 200 || !slugPattern.test(slug)) {
    return null;
  }
  
  return slug;
}

/**
 * Validates URLs to prevent malicious redirects
 * @param url - The URL to validate
 * @returns True if URL is safe, false otherwise
 */
export function validateUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    // Only allow http and https protocols
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}
