/**
 * Smart URL processing utility
 * Determines if a string is a URL to navigate to or a query to search for.
 */

// Regex for valid domain names (simplified)
const DOMAIN_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;

// Regex for IP addresses (v4)
const IP_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

// Regex for localhost with optional port
const LOCALHOST_REGEX = /^localhost(?::\d+)?$/;

/**
 * Checks if the input string looks like a valid URL or domain.
 * @param {string} input 
 * @returns {boolean}
 */
export function isUrl(input) {
    if (!input) return false;
    const trimmed = input.trim();

    // Check if it already has a protocol
    if (trimmed.match(/^[a-zA-Z]+:\/\//)) return true;

    // Check for localhost
    if (LOCALHOST_REGEX.test(trimmed)) return true;

    // Check for IP address
    if (IP_REGEX.test(trimmed)) return true;

    // Check if it looks like a domain (e.g. google.com)
    // We split by slash to get the domain part if there's a path
    const domainPart = trimmed.split('/')[0];
    if (DOMAIN_REGEX.test(domainPart)) return true;

    return false;
}

/**
 * Processes the input string and returns the final URL to navigate to.
 * If it's a URL, returns the URL (adding https:// if missing).
 * If it's a query, returns a Google search URL.
 * @param {string} input 
 * @returns {string}
 */
export function processUrlInput(input) {
    if (!input) return '';
    let trimmed = input.trim();

    // If it's already a URL with protocol, return as is
    if (trimmed.match(/^[a-zA-Z]+:\/\//)) {
        return trimmed;
    }

    // Special handling for localhost
    if (trimmed.startsWith('localhost')) {
        return `http://${trimmed}`;
    }

    // If it allows for likely URL formats (e.g. user typed 'google.com')
    if (isUrl(trimmed)) {
        return `https://${trimmed}`;
    }

    // Default to Google Search
    return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}
