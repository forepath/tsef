import type { LoadweaverContext } from '../context';

export function printStructuredOutput(ctx: LoadweaverContext, payload: unknown): void {
  if (ctx.options.json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (typeof payload === 'string') {
    console.log(payload);
    return;
  }

  console.log(JSON.stringify(payload, null, 2));
}
