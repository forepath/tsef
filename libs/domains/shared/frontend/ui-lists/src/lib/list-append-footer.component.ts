import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'forepath-list-append-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="forepath-list-append-footer py-3 d-flex justify-content-center align-items-center">
      @if (loading) {
        <div class="spinner-border" role="status" aria-live="polite">
          <span class="visually-hidden">Loading</span>
        </div>
      } @else if (error) {
        <button
          type="button"
          class="btn btn-link p-0"
          (click)="retry.emit()"
          [attr.aria-label]="retryLabel"
          title="{{ retryLabel }}"
        >
          <i class="bi bi-arrow-repeat fs-4" aria-hidden="true"></i>
        </button>
      }
    </div>
  `,
  styles: [
    `
      .forepath-list-append-footer {
        min-height: 3rem;
        margin-top: 0.5rem;
        margin-bottom: 0.5rem;
      }
    `,
  ],
})
export class ListAppendFooterComponent {
  @Input() loading = false;
  @Input() error = false;
  @Input() retryLabel = 'Retry loading more';
  @Output() readonly retry = new EventEmitter<void>();
}
