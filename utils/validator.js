/**
 * URL Validator for supported affiliate platforms
 */

const SUPPORTED_DOMAINS = [
  'flipkart.com',
  'fkrt.to',
  'dl.flipkart.com',
  'myntra.com',
  'amazon.in',
  'ajio.com'
];

/**
 * Validates if a URL is valid and from a supported domain
 * @param {string} url - The URL to validate
 * @returns {Object} - { isValid: boolean, domain: string|null, error: string|null }
 */
function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return {
      isValid: false,
      domain: null,
      error: 'URL is required and must be a string'
    };
  }

  // Basic URL format validation
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (error) {
    return {
      isValid: false,
      domain: null,
      error: 'Invalid URL format'
    };
  }

  // Check if protocol is http or https
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return {
      isValid: false,
      domain: null,
      error: 'URL must use HTTP or HTTPS protocol'
    };
  }

  // Extract domain and check if supported
  const hostname = parsedUrl.hostname.toLowerCase();
  const domain = SUPPORTED_DOMAINS.find(d => hostname.includes(d));

  if (!domain) {
    return {
      isValid: false,
      domain: null,
      error: `Unsupported domain. Supported domains: ${SUPPORTED_DOMAINS.join(', ')}`
    };
  }

  return {
    isValid: true,
    domain: domain,
    error: null
  };
}

/**
 * Sanitizes URL by removing tracking parameters
 * @param {string} url - The URL to sanitize
 * @returns {string} - Sanitized URL
 */
function sanitizeUrl(url) {
  try {
    const parsedUrl = new URL(url);
    // Remove common tracking parameters
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'affid'];
    trackingParams.forEach(param => {
      parsedUrl.searchParams.delete(param);
    });
    return parsedUrl.toString();
  } catch (error) {
    return url;
  }
}

module.exports = {
  validateUrl,
  sanitizeUrl,
  SUPPORTED_DOMAINS
};
