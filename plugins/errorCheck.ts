/**
 * @file 插件-es6语法检测
 * @author kaivean
 */

import fs from 'fs-extra';

import {writeFile, execScript, getHomeDir, md5, del} from '../lib/util';

import TesterContext from '../lib/testerContext';
import Plugin from './plugin';


interface ScriptData {
    attr: NamedNodeMap;
    text: string;
}


function ignoreMessage(text: string, url: string) {
    const filters = [
        'http://m.baidu.com/rec_err/index.html',
        'Not allowed to launch \'baiduboxapp:',
        'Failed to launch \'baiduboxapp:',
        'Refused to frame \'\' because it violates the following Content Security Policy directive',
    ];

    return filters.some(item => (text + url).includes(item));
}

/**
 * 插件是指在一个页面的一次评测过程中实现某一项独立的评测功能
 */
export default class ErrorCheckPlugin extends Plugin {
    // constructor() {

    // }

    /**
     * 插件钩子，当评测过程-浏览器实例初始化后
     * @param {ctx: TesterContext} ctx 上下文
     */
    async onInited() {

    }

    /**
     * 插件钩子，当评测过程-浏览器实例初始化后
     * @param {ctx: TesterContext} ctx 上下文
     */
    async onBrowserInited(ctx: TesterContext) {
        ctx.runLighthouse = true;
    }

    /**
     * 插件钩子，当评测过程-已执行完lighthouse
     * @param {ctx: TesterContext} ctx 上下文
     */
    async onTested(ctx: TesterContext) {
        if (!(ctx.runnerResult && ctx.browser)) {
            return;
        }
        const opt = ctx.testerOption;

        const scripts = ctx.runnerResult.artifacts.ScriptElements;


        const execTask = async item => {
            const type = item.type || 'javascript';
            if (type.includes('javascript') && item.content) {
                await fs.ensureDir(getHomeDir('node4'));
                const filepath = getHomeDir('node4', md5(item.content) + '.js');
                try {
                    await writeFile(filepath, item.content);
                    const cmd = `${opt.errorCheckNode4} ${filepath}`;
                    await execScript(cmd);
                }
                catch (e) {
                    if (e.message.includes('SyntaxError')) {
                        return e.message;
                    }
                }
                del(filepath);
            }
            return '';
        };

        // 识别语法报错
        if (opt.errorCheckNode4) {
            const results: string[] = await Promise.all(
                scripts.map(async item => {
                    return execTask(item);
                })
            ) as string[];
            let num = 0;
            const info: string[] = [];
            for (const result of results) {
                if (result) {
                    num++;
                    info.push(result);
                }
            }

            ctx.addMetric({
                group: 'errorCheck',
                name: 'syntaxError',
                label: 'syntaxError',
                value: num,
                info,
            });
        }

        // 识别console错误
        const consoles = ctx.runnerResult.artifacts.ConsoleMessages;
        let num = 0;
        let info: string[] = [];
        for (const item of consoles) {
            if (['error'].includes(item.entry.level)) {
                if (ignoreMessage(item.entry.text, item.entry.url || '')) {
                    continue;
                }
                num++;
                info.push(`${item.entry.text}[${item.entry.url || ''}]`);
            }
        }
        ctx.addMetric({
            group: 'errorCheck',
            name: 'consoleError',
            label: 'consoleError',
            value: num,
            info,
        });

        // 识别Mock特定常见错误
        num = 0;
        info = [];
        const mockPage = await ctx.browser.newPage();
        await mockPage.evaluateOnNewDocument(() => {
            (window.prompt as any) = function () {};

            (window.performance as any) = undefined;
            (Array.prototype.findIndex as any) = undefined;
        });
        mockPage.on('console', e => {
            if (e.type() === 'error') {
                if (ignoreMessage(e.text(), e.location().url || '')) {
                    return;
                }
                // console.log('[Mock Console]', e.text(), e.type());
                num++;
                info.push(`${e.text()}[${e.location().url || ''}]`);
            }
        });
        await mockPage.goto(ctx.url);

        ctx.addMetric({
            group: 'errorCheck',
            name: 'mockError',
            label: 'mockError',
            value: num,
            info,
        });
    }
}
