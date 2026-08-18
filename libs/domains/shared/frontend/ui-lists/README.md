# shared-frontend-ui-lists

Shared Angular list performance primitives for Decabill and Agenstra consoles.

## Exports

- `InfiniteScrollDirective` (`sharedInfiniteScroll`) — bottom sentinel observed against a required `[root]` scroll container; emits `reachedEnd`; honors `paused` / `disabled`; re-emits when those clear while still intersecting.
- `ListAppendFooterComponent` (`shared-list-append-footer`) — show only while append loading/error (spinner or retry).

Use `@angular/cdk/scrolling` `cdk-virtual-scroll-viewport` directly in feature templates for large scroll regions (boards, tables, chat).
