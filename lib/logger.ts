/**
 * @file logger
 * @author kaivean
 * @data 2019/10/22
 */

import chalk from 'chalk';

function print(args: any[], level: any, addColor: any) {
    for (let arg of args) {
        if (typeof arg === 'string') {
            level(addColor(arg));
        }
        else {
            if (arg instanceof Error) {
                level(addColor(arg.stack));
            }
            else {
                level(addColor(arg));
            }
        }
    }
}

export function debug(...args: any[]) {
    print(args, console.log, chalk.black);
}
export function info(...args: any[]) {
    print(args, console.log, chalk.green);
}
export function warn(...args: any[]) {
    print(args, console.warn, chalk.yellow);
}
export function error(...args: any[]) {
    print(args, console.error, chalk.red);
}

