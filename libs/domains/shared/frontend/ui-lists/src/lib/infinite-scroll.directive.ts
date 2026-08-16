import { Directive, ElementRef, EventEmitter, Input, NgZone, OnDestroy, OnInit, Output, inject } from '@angular/core';

/**
 * Emits when the host (or optional root) intersects the viewport near the bottom
 * of a scrollable list. Pauses while `paused` is true (e.g. append error until retry).
 */
@Directive({
  selector: '[sharedInfiniteScroll]',
  standalone: true,
})
export class InfiniteScrollDirective implements OnInit, OnDestroy {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly zone = inject(NgZone);

  @Input() root: Element | null = null;
  @Input() rootMargin = '0px 0px 200px 0px';
  @Input() threshold = 0;
  @Input() paused = false;
  @Input() disabled = false;

  @Output() readonly reachedEnd = new EventEmitter<void>();

  private observer: IntersectionObserver | null = null;
  private intersecting = false;

  ngOnInit(): void {
    this.zone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          this.intersecting = Boolean(entry?.isIntersecting);

          if (this.intersecting && !this.paused && !this.disabled) {
            this.zone.run(() => this.reachedEnd.emit());
          }
        },
        {
          root: this.root,
          rootMargin: this.rootMargin,
          threshold: this.threshold,
        },
      );
      this.observer.observe(this.elementRef.nativeElement);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}
