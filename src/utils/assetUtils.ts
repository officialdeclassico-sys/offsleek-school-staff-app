/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Resolves local asset paths correctly under Vite's base path (e.g., GitHub Pages repository path `/offsleek-school-staff-app/`).
 * Preserves remote URLs, data URIs, and external links unchanged.
 */
export const getAssetUrl = (path?: string | null): string => {
  if (!path) return '';
  const trimmed = path.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  const base = import.meta.env.BASE_URL || '/';
  const cleanPath = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  return `${cleanBase}${cleanPath}`;
};
