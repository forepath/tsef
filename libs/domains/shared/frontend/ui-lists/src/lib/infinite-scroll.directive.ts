import {
  AfterViewInit,
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';

/**
 * Observes a bottom sentinel. Put the directive on a 1px sentinel as the last child of a
 * scrollable container, and pass that container via `root`. Emits `reachedEnd` when the
 * sentinel intersects the scroll root (including when `paused`/`disabled` clear while still visible).
 */
@Directive({
  selector: '[sharedInfiniteScroll]',
  standalone: true,
})
export class InfiniteScrollDirective implements AfterViewInit, OnDestroy, OnChanges {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly zone = inject(NgZone);

  /** Scrollable ancestor used as IntersectionObserver root. Required for nested scroll areas. */
  @Input({ required: true }) root!: Element;

  @Input() rootMargin = '0px 0px 200px 0px';
  @Input() threshold = 0;
  @Input() paused = false;
  @Input() disabled = false;

  @Output() readonly reachedEnd = new EventEmitter<void>();

  private observer: IntersectionObserver | null = null;
  private intersecting = false;
  private emittedForCurrentIntersection = false;

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          const wasIntersecting = this.intersecting;
          this.intersecting = Boolean(entry?.isIntersecting);

          if (!this.intersecting) {
            this.emittedForCurrentIntersection = false;
          } else if (!wasIntersecting) {
            this.emittedForCurrentIntersection = false;
          }

          this.maybeEmit();
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['paused'] || changes['disabled']) {
      if (!this.paused && !this.disabled) {
        this.emittedForCurrentIntersection = false;
      }

      this.maybeEmit();
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  private maybeEmit(): void {
    if (!this.intersecting || this.paused || this.disabled || this.emittedForCurrentIntersection) {
      return;
    }

    this.emittedForCurrentIntersection = true;
    this.zone.run(() => this.reachedEnd.emit());
  }
}
