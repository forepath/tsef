import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy } from '@angular/router';

/**
 * Custom RouteReuseStrategy that reuses component instances when navigating
 * between routes that use the same component.
 *
 * This prevents components from being destroyed and recreated when navigating
 * between routes that share the same component, preserving component state.
 */
export class ComponentReuseStrategy implements RouteReuseStrategy {
  private storedRoutes = new Map<string, DetachedRouteHandle>();

  /**
   * Determines if a route should be stored for potential reuse.
   * Returns true if the route has a component (not a redirect or lazy-loaded route without component).
   */
  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return !!route.component;
  }

  /**
   * Stores the detached route handle for potential reuse.
   */
  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
    if (handle) {
      const key = this.getRouteKey(route);
      this.storedRoutes.set(key, handle);
    }
  }

  /**
   * Determines if a route should be reused.
   * Returns true if the route being navigated to uses the same component
   * as a previously stored route.
   */
  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    const key = this.getRouteKey(route);
    return this.storedRoutes.has(key);
  }

  /**
   * Retrieves the stored route handle for reuse.
   */
  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    const key = this.getRouteKey(route);
    return this.storedRoutes.get(key) || null;
  }

  /**
   * Determines if a route should be reused when navigating.
   * Returns true if the current route and the future route use the same component.
   */
  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    // Check if both routes have the same component
    if (future.component === curr.component) {
      return true;
    }

    // If components differ, check if we should reuse based on component type
    // This handles cases where routes might have different instances but same component class
    const futureComponent = future.component;
    const currComponent = curr.component;

    if (futureComponent && currComponent) {
      // Compare component constructors/classes
      return futureComponent === currComponent;
    }

    // Default Angular behavior: reuse if route configs match
    return future.routeConfig === curr.routeConfig;
  }

  /**
   * Generates a unique key for a route based on its component.
   * This key is used to store and retrieve route handles.
   */
  private getRouteKey(route: ActivatedRouteSnapshot): string {
    // Use component name/constructor as the key
    if (route.component) {
      return route.component.name || route.component.toString();
    }

    // Fallback to route path if no component
    return route.routeConfig?.path || route.url.map((segment) => segment.path).join('/');
  }
}
