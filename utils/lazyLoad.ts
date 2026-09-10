import { lazy, ComponentType } from 'react';

/**
 * A wrapper around React.lazy that attempts to refresh the page if loading the component fails.
 * This is common in SPAs when a new deployment occurs, causing old chunk filenames to be deleted
 * from the server, resulting in a ChunkLoadError for users with the old index.html cached.
 */
export const lazyRetry = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  name: string = 'Component'
) => {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (error: any) {
      console.error(`Failed to load ${name}:`, error);
      
      // Check session storage to prevent infinite reload loops
      const pageHasAlreadyBeenForceRefreshed = JSON.parse(
        window.sessionStorage.getItem(`retry-${name}-refreshed`) || 'false'
      );

      // If the error is likely a chunk load error (network error or missing file) and we haven't refreshed yet
      if (!pageHasAlreadyBeenForceRefreshed) {
        // Mark that we are refreshing so we don't do it again immediately
        window.sessionStorage.setItem(`retry-${name}-refreshed`, 'true');
        // Reload the page to get the new index.html and valid chunk references
        window.location.reload();
        
        // Return a promise that never resolves to pause rendering while the page reloads
        return new Promise(() => {});
      }

      // If we already refreshed and it still fails, let the Error Boundary handle it
      throw error;
    }
  });
};