#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import program from 'commander';
import {getRootDir} from '../lib/util';
import main from '../cli/main';

const packageJson = JSON.parse(fs.readFileSync(path.join(getRootDir(), 'package.json'), 'utf8'));


program
    .version(packageJson.version)
    .usage('[options] [url1 [url2 [...]]]')
    .option('-c, --count <count>', 'Count for running the url')
    .option('-e, --extra-header <extraHeader>', 'Define header')
    .option('-u, --user-agent <userAgent>', 'Define userAgent')
    .option('--cache', 'Define whether use cache')
    .option('--error-check-node4 <errorCheckNode4>', 'Only for plugin errorCheck, Define node 4.x executable bin path')
    .option('--wise-size-amd-json <wiseSizeAmdJson>', 'Only for plugin wiseSize, Define amdJson')
    .parse(process.argv);

main(program.opts(), program.args);

