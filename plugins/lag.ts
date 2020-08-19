/**
 * @file 插件-卡顿评测
 * @author kaivean
 */

import TesterContext from '../lib/testerContext';

import Plugin from './plugin';


// function getValue(lhr: LH.Result, target: string, isMicroSec?: number) {
//     let result = 0;
//     if (isMicroSec) {
//         result = lhr.audits[target].numericValue || 0;
//         return Number.isInteger(result) ? result : +result.toFixed(3);
//     }
//     return (lhr.audits[target].numericValue || 0) / 1000;
// }

/**
 * 插件是指在一个页面的一次评测过程中实现某一项独立的评测功能
 */
export default class LagPlugin extends Plugin {
    /**
     * 插件钩子，当评测过程-浏览器实例初始化后
     * @param {} 浏览器实例
     * @param {} puppeteer实例
     */
    async onInited() {

    }

    /**
     * 插件钩子，当评测过程-浏览器实例初始化后
     * @param {} 浏览器实例
     * @param {} puppeteer实例
     */
    async onBrowserInited(ctx: TesterContext) {
        // const page = await ctx.browser.newPage();
        // await page.goto(ctx.url);
        ctx.runLighthouse = true;
    }

    /**
     * 插件钩子，当评测过程-已执行完lighthouse
     * @param {ctx: TesterContext} ctx 上下文
     */
    async onTested(ctx: TesterContext) {
        if (!ctx.browser || !ctx.runnerResult) {
            return;
        }

        const lhr = ctx.runnerResult.lhr;

        let audit = lhr.audits.diagnostics as any;
        let details: any = audit.details || {items: []};
        if (details) {
            ctx.addMetric({
                group: 'lag',
                name: 'longTask',
                label: 'longTask',
                value: details.items[0].numTasksOver50ms,
            });
        }

        audit = lhr.audits['mainthread-work-breakdown'] as any;
        details = audit.details || {items: []};
        ctx.addMetric({
            group: 'lag',
            name: 'mainthread-work-breakdown',
            label: 'mainthread-work-breakdown',
            value: audit.numericValue,
        });

        for (const item of details.items) {
            ctx.addMetric({
                group: 'lag',
                name: `mainthread-work-breakdown.${item.group}`,
                label: item.group,
                value: item.duration,
            });
        }

        audit = lhr.audits['total-blocking-time'] as any;
        ctx.addMetric({
            group: 'lag',
            name: 'tbt',
            label: 'total-blocking-time',
            value: audit.numericValue,
        });

        audit = lhr.audits['dom-size'] as any;
        details = audit.details || {items: []};
        ctx.addMetric({
            group: 'lag',
            name: 'domSize',
            label: 'domSize',
            value: audit.numericValue,
        });

        ctx.addMetric({
            group: 'lag',
            name: 'domDepth',
            label: 'domDepth',
            value: +details.items[1].value,
        });

        audit = lhr.audits['cumulative-layout-shift'] as any;
        details = audit.details || {items: []};
        ctx.addMetric({
            group: 'lag',
            name: 'cls',
            label: 'cumulative-layout-shift',
            value: audit.numericValue * 100,
        });

        audit = lhr.audits['first-cpu-idle'] as any;
        ctx.addMetric({
            group: 'lag',
            name: 'fci',
            label: 'first-cpu-idle',
            value: audit.numericValue,
        });

        audit = lhr.audits['max-potential-fid'] as any;
        ctx.addMetric({
            group: 'lag',
            name: 'fid',
            label: 'first-input-delay',
            value: audit.numericValue,
        });
    }
}
