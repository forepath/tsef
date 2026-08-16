# shared-frontend-ui-lists

Shared Angular list performance primitives for Decabill and Agenstra consoles.

## Exports

- `InfiniteScrollDirective` (`sharedInfiniteScroll`) — IntersectionObserver sentinel; emits `reachedEnd`; honors `paused` / `disabled`.
- `ListAppendFooterComponent` (`shared-list-append-footer`) — centered spinner while appending; clickable `bi-arrow-repeat` on error.

Use `@angular/cdk/scrolling` `cdk-virtual-scroll-viewport` directly in feature templates for large scroll regions (boards, tables, chat).
