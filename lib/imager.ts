/**
 * @file 图片处理和优化
 * @author kaivean
 */

import fs from 'fs-extra';
import webp from 'webp-converter';

import TesterContext from '../lib/testerContext';

function convert(file: string, newfile: string) {
    return new Promise((resolve, reject) => {
        let converter = file.toLowerCase().endsWith('.gif') ? webp.gwebp : webp.cwebp;
        converter(file, newfile, '', (status: number, error: Error) => {
            // if convertsion successful status will be '100'
            // if conversion fails status will be '101'
            if (error) {
                reject(error);
            }
            else {
                resolve();
            }
        });
    });
}

function getSize(file: string) {
    return fs.statSync(file).size / 1024;
}

function adjustNumber(val: number) {
    return Number.isInteger(val) ? val : +val.toFixed(1);
}

async function execTask(item: any) {
    let ret = {
        url: item.url,
        originSize: getSize(item.file),
        mimeType: item.mimeType,
        optedSize: 0,
        host: '',
    };
    ret.optedSize = ret.originSize;
    const url = item.url as string;
    const urlObj = new URL(url);
    ret.host = urlObj.host + urlObj.pathname.split('/').slice(0, 2).join('/');

    if (ret.originSize <= 0) {
        return ret;
    }

    const optedPath = `${item.file}.webp`;

    try {
        await convert(item.file, optedPath);
        ret.optedSize = getSize(optedPath);
    }
    catch (e) {
        console.error('Fail to convert to webp', e);
    }

    return ret;
}

export async function optimizeImage(fileItems: any[], ctx: TesterContext) {
    // 处理资源
    let info = {
        imgNum: 0, // 可优化的图片数量
        imgs: [] as string[],
        imgOriginSize: 0, // 可优化的图片原始大小
        imgOptedSize: 0, // 可优化的图片优化后的大小
        imgOptedSizeDiff: 0, // 优化后减少多少

        imgJpgNum: 0, // 仅 jpg 和 jpeg
        imgJpgOriginSize: 0, // 仅 Jpg 和 jpeg
        imgJpgSize: 0, // 仅 Jpg 和 jpeg
        imgJpgSizeDiff: 0, // // 仅 jpg 和 jpeg 优化后减少多少
    };

    if (!ctx.runnerResult) {
        return info;
    }

    const hosts = new Set();

    const results = await Promise.all(
        fileItems.map(async item => {
            return execTask(item);
        })
    );

    const ignores: string[] = [];
    for (const row of results) {
        if (!row.mimeType) {
            ignores.push(row.url);
            continue;
        }

        hosts.add(row.host);

        info.imgNum++;
        info.imgOriginSize += row.originSize;
        info.imgOptedSize += row.optedSize;

        // 该图片被优化了
        if (row.originSize > row.optedSize) {
            info.imgs.push(row.url);
        }

        if (['image/jpeg', 'image/jpg'].includes(row.mimeType)) {
            info.imgJpgNum++;
            info.imgJpgOriginSize += row.originSize;
            info.imgJpgSize += row.optedSize;
        }
    }

    info.imgOptedSizeDiff = info.imgOriginSize - info.imgOptedSize;
    info.imgJpgSizeDiff = info.imgJpgOriginSize - info.imgJpgSize;

    // console.log('---- hosts of optimized images  ------');
    // console.log(Array.from(hosts).join('\n'));

    // console.log('---- ignores images  ------');
    // console.log(ignores.join('\n'));

    info.imgNum = adjustNumber(info.imgNum);
    info.imgOriginSize = adjustNumber(info.imgOriginSize);
    info.imgOptedSize = adjustNumber(info.imgOptedSize);
    info.imgOptedSizeDiff = adjustNumber(info.imgOptedSizeDiff);
    info.imgJpgNum = adjustNumber(info.imgJpgNum);
    info.imgJpgOriginSize = adjustNumber(info.imgJpgOriginSize);
    info.imgJpgSize = adjustNumber(info.imgJpgSize);
    info.imgJpgSizeDiff = adjustNumber(info.imgJpgSizeDiff);

    return info;
}
