import { Command } from 'commander';
import { web } from '../index';
import { clirun } from './utils';
import {
  makeBranchOption,
  makeCIOption,
  makeCleanOption,
  makeForceOption,
  makeYesOption,
  makeWriteTocOption,
  makeStrictOption,
  makeCheckLinksOption,
  makeKeepHostOption,
  makeHeadlessOption,
} from './options';

// function makeCurvenoteCloneCLI(program: Command) {
//   const command = new Command('clone')
//     .description('Clone curvenote into the build directory')
//     .addOption(makeBranchOption())
//     .action(clirun(web.clone, { program, requireSiteConfig: true }));
//   return command;
// }

// function makeCurvenoteInstallCLI(program: Command) {
//   const command = new Command('install')
//     .description('Install dependencies for serving')
//     .action(clirun(web.install, { program, requireSiteConfig: true }));
//   return command;
// }

function makeCurvenoteStartCLI(program: Command) {
  const command = new Command('start')
    .description('Start a local project as a web server')
    .addOption(makeCleanOption())
    .addOption(makeForceOption())
    .addOption(makeBranchOption())
    .addOption(makeKeepHostOption())
    .addOption(makeHeadlessOption())
    .action(clirun(web.startServer, { program, requireSiteConfig: true }));
  return command;
}

function makeBuildCLI(program: Command) {
  const command = new Command('build')
    .description('Deploy content to https://*.curve.space or your own domain')
    .addOption(makeCleanOption())
    .addOption(makeForceOption())
    .addOption(makeBranchOption())
    .addOption(makeWriteTocOption())
    .addOption(makeCIOption())
    .addOption(makeStrictOption())
    .addOption(makeCheckLinksOption())
    .action(clirun(web.build, { program, requireSiteConfig: true }));
  return command;
}

function makeDeployCLI(program: Command) {
  const command = new Command('deploy')
    .description('Deploy content to https://*.curve.space or your own domain')
    .addOption(makeYesOption())
    .addOption(makeForceOption())
    .addOption(makeCIOption())
    .addOption(makeStrictOption())
    .addOption(makeCheckLinksOption())
    .action(clirun(web.deploy, { program, requireSiteConfig: true }));
  return command;
}

export function addWebCLI(program: Command): void {
  const command = new Command('web').description(
    'Commands to clone, install, or clean the webserver',
  );
  // command.addCommand(makeCurvenoteCloneCLI(program));
  // command.addCommand(makeCurvenoteInstallCLI(program));
  program.addCommand(command);
  // Top level are `start`, `deploy`, and `build`
  program.addCommand(makeCurvenoteStartCLI(program));
  program.addCommand(makeDeployCLI(program));
  program.addCommand(makeBuildCLI(program));
}
