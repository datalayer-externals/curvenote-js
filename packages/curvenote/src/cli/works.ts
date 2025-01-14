import { Command, Option } from 'commander';
import * as works from '../works/index.js';
import { clirun } from './utils.js';

function makeWorksCLI() {
  const command = new Command('works').description('Create and manage your Works');
  return command;
}

function makeWorksListCLI(program: Command) {
  const command = new Command('list')
    .description('List your Works')
    .action(clirun(works.list, { program, requireSiteConfig: true }));
  return command;
}

export function addWorksCLI(program: Command): void {
  const worksProgram = makeWorksCLI();
  worksProgram.addCommand(makeWorksListCLI(program));
  program.addCommand(worksProgram);
}
