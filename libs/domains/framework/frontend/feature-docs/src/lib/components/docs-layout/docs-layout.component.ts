import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { NavigationNode } from '@forepath/framework/frontend/util-docs-parser';
import { DocsNavigationService, ThemeService } from '../../services';
import { DocsNavigationComponent } from '../docs-navigation/docs-navigation.component';
import { DocsSearchComponent } from '../docs-search/docs-search.component';

@Component({
  selector: 'framework-docs-layout',
  imports: [CommonModule, RouterModule, DocsNavigationComponent, DocsSearchComponent],
  templateUrl: './docs-layout.component.html',
  styleUrls: ['./docs-layout.component.scss'],
  standalone: true,
})
export class DocsLayoutComponent {
  private readonly navigationService = inject(DocsNavigationService);
  protected readonly themeService = inject(ThemeService);

  /**
   * Get the base path (/docs) based on current route
   */
  getBasePath(): string {
    return '/docs';
  }

  /**
   * Navigation nodes
   */
  readonly navigationNodes = toSignal(this.navigationService.loadNavigation(), {
    initialValue: [] as NavigationNode[],
  });

  /**
   * Mobile menu visibility
   */
  readonly mobileMenuOpen = signal<boolean>(false);

  /**
   * Toggle mobile menu
   */
  toggleMobileMenu(): void {
    this.mobileMenuOpen.set(!this.mobileMenuOpen());
  }

  /**
   * Close mobile menu
   */
  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}
