/**
 * @file 一个页面的一次评测过程
 * @author kaivean
 */


import {exec} from 'child_process';
import fs from 'fs';
import path from 'path';

import puppeteer from 'puppeteer';
import lighthouse from 'lighthouse';
import {fromLog} from 'chrome-har-capturer';

import * as logger from '../lib/logger';

import {
    TesterOption,
    TesterResult,
} from '../lib/interface';

import {
    writeFile,
} from '../lib/util';

import TesterContext from '../lib/testerContext';

import Scheduler from './scheduler';
import createSetting from './createSetting';


// const iPhoneX = puppeteer.devices['iPhone X'];


// 重要：这里模拟MOTOG4
// 为什么不直接用page.emulate呢？ 因为在该回调里，修改viewport，里面会reload，导致加载失败
// 里面的各种配置，是参考的lighthouse里的默认配置，node_modules/lighthouse/lighthouse-core/lib/emulation.js
async function emulate(page: puppeteer.Page, userAgent) {
    const client = await page.target().createCDPSession();
    // const client = (page as any)._client as puppeteer.CDPSession;
    userAgent && await client.send('Network.setUserAgentOverride', {
        userAgent: userAgent,
    });

    await client.send('Emulation.setDeviceMetricsOverride', {
        mobile: true,
        screenWidth: 360,
        screenHeight: 640,
        width: 360,
        height: 640,
        positionX: 0,
        positionY: 0,
        scale: 1,
        // Moto G4 is really 3, but a higher value here works against
        // our perf recommendations.
        // https://github.com/GoogleChrome/lighthouse/issues/10741#issuecomment-626903508
        deviceScaleFactor: 2.625,
        screenOrientation: {
            angle: 0,
            type: 'portraitPrimary',
        },
    });
    await client.send('Emulation.setTouchEmulationEnabled', {
        enabled: true,
    });
}

class Task {
    scheduler: Scheduler;

    constructor() {
        this.scheduler = new Scheduler();
    }

    async testOnePage(url: string, option: TesterOption) {
        const startTime = Date.now();
        const ret: TesterResult = {
            cost: 0,
            error: null,
            metrics: null,
            traces: null,
            networks: null,
            mainDocument: null,
            screenShot: null,
        };

        const ctx = new TesterContext(url, option);

        this.register(option);

        ctx.launchOpt = {
            headless: true,
            // handleSIGTERM: false,
            // handleSIGHUP: false,
            // devtools: true, // Whether to auto-open a DevTools panel for each tab. If this option is true, the headless option will be set false
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            // userDataDir: userDataDir,
            // defaultViewport: null,
        };

        try {
            await this.scheduler.dispatch('onInited', ctx);

            await this.openBrowser(option, ctx);

            await this.scheduler.dispatch('onBrowserInited', ctx);

            await this.openCache(option, ctx);

            await this.openLighthouse(option, ctx);

            // await this.openPage(option, ctx);

            await this.scheduler.dispatch('onTested', ctx);

            const logInfo = await this.saveLog(option, ctx);
            Object.assign(ret, logInfo);
            ret.metrics = ctx.getMetric();
        }
        catch (e) {
            logger.error('Task Error: ', e);
            ret.error = e;
        }
        finally {
            await this.closeBrowser(option, ctx);
        }

        ret.cost = Date.now() - startTime;

        return ret;
    }

    register(option: TesterOption) {
        if (option.customPluginPaths) {
            for (const plugPath of option.customPluginPaths) {
                if (fs.existsSync(plugPath)) {
                    try {
                        /* eslint-disable @typescript-eslint/no-var-requires */
                        /* eslint-disable @typescript-eslint/no-require-imports */
                        // eslint-disable-next-line import/no-dynamic-require
                        let PlugClass = require(plugPath);
                        if (PlugClass.default) {
                            PlugClass = PlugClass.default;
                        }
                        new PlugClass(); // 尝试初始化下，有报错及时报出
                        let name: string = PlugClass.name.replace('Plugin', '');
                        // 首字母小写
                        name = name.substring(0, 1).toLowerCase() + name.substring(1);
                        Scheduler.register(name, PlugClass);
                    }
                    catch (e) {
                        logger.error(`Failed to init plug: ${plugPath}`);
                        logger.error(e);
                    }
                }
            }
        }
        if (option.plugins && option.plugins.length) {
            this.scheduler.select(option.plugins);
        }
        else {
            this.scheduler.select();
        }
    }

    async openBrowser(option: TesterOption, ctx: TesterContext) {
        ctx.browser = await puppeteer.launch(ctx.launchOpt);

        const initPage = async (target: puppeteer.Target) => {
            const page = await target.page();
            if (!page) {
                return;
            }

            // 重要
            // 为什么不直接用page.emulate呢？ 因为在该回调里，修改viewport，里面会reload，导致加载失败
            await emulate(page, option.userAgent);

            // 网络截流
            // network && await page._client.send('Network.emulateNetworkConditions', { // 3G Slow
            //     offline: false,
            //     latency: 0, // ms
            //     downloadThroughput: -1, // 780 kb/s
            //     uploadThroughput: -1, // 330 kb/s,
            //     connectionType: network // None,Cellular2G,Cellular3G,Cellular4G,Bluetooth,Ethernet,Wifi,Wimax,Other,
            // });

            // cpu截流, CPUThrottlingRate:number, Throttling rate as a slowdown factor (1 is no throttle, 2 is 2x slowdown, etc).
            // 原理：slow down the main thread by spawning an additional thread which frequently interrupts main thread and sleeps.
            // cpuThrottlingRate
            //     && await page._client.send('Emulation.setCPUThrottlingRate', {rate: +cpuThrottlingRate});

        };

        const changePage = async (target: puppeteer.Target) => {
            // page.url(), target.url() 两者不一定一样，以target.url()为准
            const page = await target.page();
            if (!page) {
                return;
            }

            // 收集到lighthousePage对象
            if (ctx.runningLighthouse && !ctx.lighthousePage) {
                ctx.lighthousePage = page;

                await (page as any)._client.send('Runtime.evaluate', {
                    expression: 'window.prompt = function () {};',
                    includeCommandLineAPI: true,
                    awaitPromise: true,
                    returnByValue: true,
                    timeout: 6000,
                });
            }
        };

        // 当goto执行后，首先发出主文档请求，然后才会触发targetchanged事件的
        ctx.browser.on('targetchanged', changePage);
        ctx.browser.on('targetcreated', initPage);
    }

    async closeBrowser(option: TesterOption, ctx: TesterContext) {
        if (!ctx.browser) {
            return;
        }
        ctx.browser.disconnect();
        await ctx.browser.close();
        exec(`kill -9 ${ctx.browser.process().pid}`, error => {
            if (error && !error.message.includes('No such process')) {
                console.log(`Process Kill Error: ${error}`);
            }
        });
    }

    async openCache(option: TesterOption, ctx: TesterContext) {
        // 需要在跑的时候有缓存，那么先跑一次
        if (!option.cache) {
            return;
        }
        // launchOpt.userDataDir =
        const page = await ctx.browser.newPage();
        await page.evaluateOnNewDocument(() => {
            (window.prompt as any) = function () {};
        });


        // 第一次无cache，第二次有cache(出广告)，第三次也有cache（不出广告），第四次也有cache（不出广告）
        // 为了保证接下来两次是一致的，先跑两次
        await page.goto(ctx.url);
        await page.goto(ctx.url);
    }

    async openLighthouse(option: TesterOption, ctx: TesterContext) {
        if (!ctx.runLighthouse) {
            return;
        }
        ctx.flag = {
            port: +(new URL(ctx.browser.wsEndpoint())).port,
            output: 'json',
            logLevel: 'error',

            onlyCategories: [
                'performance',
                'best-practices',
                'mycustom',
            ],

            // 这里加 useragent是不生效的
            extraHeaders: option.extraHeader || {},

            // 关于截流 https://github.com/GoogleChrome/lighthouse/blob/master/docs/throttling.md
            // 默认配置：https://github.com/GoogleChrome/lighthouse/blob/8f500e00243e07ef0a80b39334bedcc8ddc8d3d0/lighthouse-core/config/constants.js#L19-L26
            throttlingMethod: 'simulate',
            // 默认是慢速4G网络设置
            // throttling: {},

            // 默认每次启动页面运行，都会清理缓存
            // 运行前禁止清除浏览器缓存，缓存文件保存在userDataDir下
            disableStorageReset: option.cache,

            emulatedFormFactor: 'none',
        };

        await this.scheduler.dispatch('onLighthouseReady', ctx);

        // lighthouse本身不暴露任何生命周期到外部，所以就自己实现了自定义gather，在该gather执行afterPass回调时，调用afterPass
        // 从而可以在lighthouse加载的页面关闭前执行一些操作
        const setting = createSetting({
            afterPass: async (passContext, passLoadData) => {
                ctx.passLoadData = passLoadData;
                ctx.passContext = passContext;
                // 各gather的afterPass声明周期
                // 当lighthous的defaultPass加载完成页面，在收集数据阶段
                await this.scheduler.dispatch('onLighthouseAfterPass', ctx);
            },
        });

        ctx.runningLighthouse = true;

        // 启动lighthouse
        // 第二项参数Flags默认设置 https://github.com/GoogleChrome/lighthouse/blob/8f500e00243e07ef0a80b39334bedcc8ddc8d3d0/lighthouse-core/config/constants.js#L19-L26
        // 第三项参数就是Lighthouse Configuration，完整的默认配置： https://github.com/GoogleChrome/lighthouse/blob/master/lighthouse-core/config/default-config.js
        const runnerResult = await lighthouse(ctx.url, ctx.flag, setting);
        ctx.runnerResult = runnerResult;
    }

    async openPage(option: TesterOption, ctx: TesterContext) {
        ctx.page = await ctx.browser.newPage();

        // 没有cache，就要清理掉lighthouse跑完留下cache
        if (!option.cache) {
            ctx.page.setCacheEnabled(false);
        }

        // ctx.page.on('console', e => {
        //     console.log('[Console]', e.text());
        // });

        await ctx.page.exposeFunction('addMetric', param => {
            ctx.addMetric(param);
        });

        // evaluateOnNewDocument 在targetcreated targetchange都不生效, 很奇怪
        await ctx.page.evaluateOnNewDocument(() => {
            (window.prompt as any) = function () {};
        });

        await this.scheduler.dispatch('onNewPage', ctx);

        // ctx.page.on('dialog', async dialog => {
        //     console.log('dialog', dialog.type());
        //     // await dialog.accept();
        //     await dialog.dismiss();
        // });

        // ctx.page.on('request', async req => {
        //     console.log('req', req.url(), req.headers());
        // });

        await ctx.page.goto(ctx.url, {
            timeout: 30000, // 单位ms, 默认30s，设置0禁用
        });
    }

    async saveLog(option: TesterOption, ctx: TesterContext) {
        const ret = {} as any;
        if (!ctx.runnerResult) {
            return ret;
        }

        option.saveLog = true;

        const dir = await ctx.getDir();

        // traces格式的文件可以被开发者工具的performance加载
        ret.traces = ctx.runnerResult.artifacts.traces.defaultPass;

        // har格式文件可以被开发者工具的network加载
        ret.networks = await fromLog(ctx.url, ctx.runnerResult.artifacts.devtoolsLogs.defaultPass);
        const jsonHar = JSON.stringify(ret.networks, null, 4);

        // 保存主文档
        ret.mainDocument = ctx.runnerResult.artifacts.MainDocumentContent;

        // 保存页面快照
        const thumbnails = ctx.runnerResult.lhr.audits['screenshot-thumbnails'];
        let details = (thumbnails.details || {items: []}) as any;
        let items = details.items.splice(0);

        const finalsceenshot = ctx.runnerResult.lhr.audits['final-screenshot'];
        details = finalsceenshot.details || {};
        items.push(details);
        ret.screenShot = items;

        if (option.saveLog) {
            writeFile(path.join(dir, 'traces.json'), JSON.stringify(ret.traces, null, 4));
            writeFile(path.join(dir, 'network.har'), jsonHar);
            writeFile(
                path.join(dir, 'mainDocument.html'),
                ret.mainDocument
            );
            writeFile(
                path.join(dir, 'screenShot.json'),
                JSON.stringify(ret.screenShot)
            );
        }
        console.log('Task Cache Directory: ', dir);
        return ret;
    }
}

export = function ({url, option}, callback) {
    const task = new Task();
    task.testOnePage(url, option).then(res => callback(null, res)).catch(e => callback(e));
};
