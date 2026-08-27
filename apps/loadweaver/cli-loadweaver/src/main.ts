import { createProgram } from '@forepath/loadweaver/shared/feature-cli/program';

const program = createProgram();

program.parseAsync(process.argv).catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
