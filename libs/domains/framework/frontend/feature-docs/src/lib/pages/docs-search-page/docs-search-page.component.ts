import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { DocsSearchService, SearchResult } from '../../services';
import { DocsSearchComponent } from '../../components';

@Component({
  selector: 'framework-docs-search-page',
  imports: [CommonModule, RouterModule, DocsSearchComponent],
  templateUrl: './docs-search-page.component.html',
  styleUrls: ['./docs-search-page.component.scss'],
  standalone: true,
})
export class DocsSearchPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly searchService = inject(DocsSearchService);

  /**
   * Search query from route
   */
  readonly searchQuery = toSignal(
    this.route.queryParams.pipe(
      map((params) => params['q'] || ''),
      filter((q) => q.length > 0),
    ),
    { initialValue: '' },
  );

  /**
   * Search results
   */
  readonly searchResults = computed(() => this.searchService.searchResults());

  /**
   * Loading state
   */
  readonly loading = signal<boolean>(true);

  ngOnInit(): void {
    const query = this.searchQuery();
    if (query) {
      this.searchService.searchQuery.set(query);
      this.searchService.loadSearchIndex().subscribe((index) => {
        if (index) {
          this.searchService.search(query, index);
        }
        this.loading.set(false);
      });
    } else {
      this.loading.set(false);
    }
  }

  /**
   * Handle result click
   */
  onResultClick(result: SearchResult): void {
    this.router.navigate([result.entry.path]);
  }
}
