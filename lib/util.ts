/**
 * @file 工具函数
 * @author kaivean
 */


import {exec} from 'child_process';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs-extra';

const unitMap = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
};

export function convertUnit(str: string, unit: 'B' | 'KB' | 'MB') {
    const byteSize = Buffer.byteLength(str);
    return +(byteSize / (unitMap[unit] || 1)).toFixed(2);
}

export function md5(content: string) {
    const md5 = crypto.createHash('md5');
    return md5.update(content).digest('hex');
}

export function writeFile(filepath: string, cont: string) {
    return new Promise(function (resolve, reject) {
        fs.writeFile(filepath, cont, function (err) {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
}

export function readFile(filepath: string) {
    return new Promise(function (resolve, reject) {
        fs.readFile(filepath, 'utf8', function (err, cont) {
            if (err) {
                return reject(err);
            }
            resolve(cont);
        });
    });
}


export function del(path: string) {
    if (path && fs.existsSync(path)) {
        const stat = fs.lstatSync(path);

        if (stat.isDirectory()) {
            fs.removeSync(path);
        }
        else if (stat.isFile()) {
            fs.unlinkSync(path);
        }
    }
};

export function execScript(cmd: string, options?: any, cfg?: any) {
    cfg = Object.assign({throws: false}, cfg || {});
    return new Promise((resolve, reject) => {
        exec(cmd, options, (err: Error, stdout: string, stderr: string) => {
            if (err) {
                reject(err);
                return;
            }

            if (stderr && cfg.throws) {
                resolve(stderr);
                return;
            }

            resolve(stdout);
        });
    });
}


export function getHomeDir(dir = '', file = '') {
    const home = path.join(
        (process as any).env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'],
        '.wmt'
    );
    const subdir = path.join(home, dir);
    fs.ensureDirSync(subdir);

    return path.join(subdir, file);
};


export function getRootDir() {
    let root = path.join(
        __dirname,
        '..'
    );
    if (fs.existsSync(path.join(root, 'package.json'))) {
        return root;
    }
    return path.join(root, '..');
};

