#!/usr/bin/env node
import * as program from 'commander';
import { populateSessionCommands } from './populate-session-commands';
import {version} from '../package.json';

process.on('warning', e => console.warn(e.stack));

program.version(version || '0.0.0', '--version');

populateSessionCommands(program);

// This fixes the arguments when debugging under e.g. VSCode.
const argv: string[] = process.argv.filter(v => v !== '--');

program.parse(argv);
