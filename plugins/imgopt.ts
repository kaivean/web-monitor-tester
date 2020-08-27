/**
 * @file 插件-卡顿评测
 * @author kaivean
 */

import path from 'path';
import fs from 'fs-extra';
import puppeteer from 'puppeteer';
import TesterContext from '../lib/testerContext';
import {optimizeImage} from '../lib/imager';
import Plugin from './plugin';

const extMap: {[k: string]: string} = {
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
};

function ignoreImgPath(url: string) {
    const items = [
        '/w.gif',
        '/static/az.gif',
        '/speed/static/tj.gif',
        '/hm.gif',
        'sestat.baidu.com/',
        'sp1.baidu.com/5b1ZeDe5KgQFm2e88IuM_a',
    ];
    for (const item of items) {
        if (url.toLowerCase().includes(item.toLowerCase())) {
            return true;
        }
    }
    return false;
}

/**
 * 插件是指在一个页面的一次评测过程中实现某一项独立的评测功能
 */
export default class ImgoptPlugin extends Plugin {
    dir: string = '';
    fileItems: any[] = [];
    // constructor() {
    //     super();
    // }

    /**
     * 插件钩子，当评测过程-初始化后
     * @param {ctx: TesterContext} ctx 上下文
     */
    async onInited(ctx: TesterContext) {
        this.dir = await ctx.getDir('imgopt');
    }

    /**
     * 插件钩子，当评测过程-浏览器实例初始化后
     * @param {ctx: TesterContext} ctx 上下文
     */
    async onBrowserInited(ctx: TesterContext) {
        ctx.runLighthouse = true;

        const changePage = async (target: puppeteer.Target) => {
            const page = await target.page();
            // logger.info('targetchanged', page);
            if (!page) {
                return;
            }
            if (decodeURI(decodeURI(target.url())) === decodeURI(ctx.url)) {

                let index = 0;
                page.on('response', async response => {

                    const header = response.headers();
                    const url = response.url();
                    if (ignoreImgPath(url)) {
                        return;
                    }
                    if (!url.startsWith('http')) {
                        return;
                    }
                    if (!header['content-type']) {
                        return;
                    }

                    const mimeType = header['content-type'].toLowerCase();
                    if (extMap[mimeType]) {

                        index++;

                        let ext = extMap[mimeType];
                        // 调整下，有时候mimeType是image/jpeg，实际是gif
                        if (/\.gif($|\?)/.test(ctx.url.toLowerCase())) {
                            ext = 'gif';
                        }

                        const originPath = path.join(this.dir, `${index}.${ext}`);
                        await fs.writeFile(originPath, await response.buffer());
                        this.fileItems.push({
                            url: url,
                            file: originPath,
                            mimeType: mimeType,
                        });
                    }
                });
            }
        };

        // 当goto执行后，首先发出主文档请求，然后才会触发targetchanged事件的
        ctx.browser.once('targetchanged', changePage);
    }

    /**
     * 插件钩子，当评测过程-lighthouse加载页面后，执行数据采集时，此时页面还未关闭
     * 可以通过 ctx.lighthousePage 访问， ctx.passContext 和 ctx.passLoadData访问已经采集的数据
     *
     * @param {} 浏览器实例
     * @param {} puppeteer
     */
    async onLighthouseAfterPass() {

    }

    /**
     * 插件钩子，当评测过程-已执行完lighthouse
     * @param {ctx: TesterContext} ctx 上下文
     */
    async onTested(ctx: TesterContext) {
        if (!ctx.browser || !ctx.runnerResult) {
            return;
        }
        const res = await optimizeImage(this.fileItems, ctx);

        ctx.addMetric({
            group: 'imgopt',
            name: 'imgNum',
            label: '总数量',
            value: res.imgNum,
        });
        ctx.addMetric({
            group: 'imgopt',
            name: 'imgOriginSize',
            label: '原始体积',
            value: res.imgOriginSize,
        });
        ctx.addMetric({
            group: 'imgopt',
            name: 'imgOptedSize',
            label: '优化后体积',
            value: res.imgOptedSize,
        });
        ctx.addMetric({
            group: 'imgopt',
            name: 'imgOptedSizeDiff',
            label: '可优化大小',
            value: res.imgOptedSizeDiff,
            info: res.imgs,
        });
    }
}
