import type { DeepLinkParams, DeepLinkRoute, ParsedDeepLink } from '@/types';

const VALID_ROUTES: DeepLinkRoute[] = ['create-worktree', 'settings'];

/**
 * Parse a grovr:// deep link URL
 * @param url - The full deep link URL (e.g., "grovr://create-worktree?project=my-project&issue=ABC-123")
 * @returns Parsed deep link data with validation
 */
export function parseDeepLink(url: string): ParsedDeepLink {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== 'grovr:') {
      return { valid: false, error: 'Invalid scheme - expected grovr://' };
    }

    // The "host" in grovr://create-worktree is "create-worktree"
    const route = parsed.hostname || parsed.pathname.replace(/^\/+/, '');

    if (!VALID_ROUTES.includes(route as DeepLinkRoute)) {
      return { valid: false, error: `Unknown route: ${route}` };
    }

    const params: DeepLinkParams = {
      route: route as DeepLinkRoute,
    };

    const searchParams = parsed.searchParams;

    if (searchParams.has('project')) {
      params.project = searchParams.get('project')!;
    }

    if (searchParams.has('issue')) {
      params.issue = searchParams.get('issue')!;
    }

    if (searchParams.has('description')) {
      params.description = searchParams.get('description')!;
    }

    if (searchParams.has('branch')) {
      params.branch = searchParams.get('branch')!;
    }

    return { valid: true, params };
  } catch (err) {
    return { valid: false, error: `Failed to parse URL: ${err}` };
  }
}

/**
 * Find the best matching project by name using fuzzy matching
 * Priority: exact match > case-insensitive match > contains match
 * @returns The matching project or null if no match found
 */
export function findBestMatchingProject<T extends { name: string }>(
  searchName: string,
  projects: T[]
): T | null {
  if (!searchName || projects.length === 0) return null;

  const lowerSearch = searchName.toLowerCase();

  // 1. Exact match
  const exactMatch = projects.find((p) => p.name === searchName);
  if (exactMatch) return exactMatch;

  // 2. Case-insensitive match
  const caseInsensitiveMatch = projects.find((p) => p.name.toLowerCase() === lowerSearch);
  if (caseInsensitiveMatch) return caseInsensitiveMatch;

  // 3. Contains match (find the shortest name that contains the search term)
  const containsMatches = projects.filter((p) => p.name.toLowerCase().includes(lowerSearch));
  if (containsMatches.length > 0) {
    // Return the shortest matching name (most specific match)
    return containsMatches.reduce((shortest, current) =>
      current.name.length < shortest.name.length ? current : shortest
    );
  }

  return null;
}

/**
 * Generate a deep link URL for creating a worktree
 */
export function generateCreateWorktreeLink(options?: {
  project?: string;
  issue?: string;
  description?: string;
  branch?: string;
}): string {
  const params = new URLSearchParams();

  if (options?.project) {
    params.set('project', options.project);
  }
  if (options?.issue) {
    params.set('issue', options.issue);
  }
  if (options?.description) {
    params.set('description', options.description);
  }
  if (options?.branch) {
    params.set('branch', options.branch);
  }

  const queryString = params.toString();
  return `grovr://create-worktree${queryString ? '?' + queryString : ''}`;
}
