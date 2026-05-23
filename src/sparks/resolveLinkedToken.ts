import type { LinkResolver } from '../motes/types.js';

/**
 * Resolves a single @linked token (e.g. "JIRA-1234") to a URL based on the
 * configured link resolvers. Returns the token unchanged when no resolver
 * matches.
 */
export function resolveLinkedToken(token: string, resolvers: readonly LinkResolver[]): string {
  for (const r of resolvers) {
    if (token.startsWith(r.prefix)) {
      const id = token.slice(r.prefix.length);
      return r.template.replace('{id}', id);
    }
  }
  return token;
}
