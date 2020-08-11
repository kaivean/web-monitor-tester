/**
 * @file 插件-卡顿评测
 * @author kaivean
 */

import TesterContext from '../lib/testerContext';

import Plugin from './plugin';


function getValue(lhr: LH.Result, target: string) {
    return (lhr.audits[target].numericValue || 0);
}


/**
 * 插件是指在一个页面的一次评测过程中实现某一项独立的评测功能
 */
export default class LagPlugin extends Plugin {
    /**
     * 插件钩子，当评测过程-浏览器实例初始化后
     * @param {} 浏览器实例
     * @param {} puppeteer实例
     */
    async onInited(ctx: TesterContext) {

    }

    /**
     * 插件钩子，当评测过程-浏览器实例初始化后
     * @param {} 浏览器实例
     * @param {} puppeteer实例
     */
    async onBrowserInited(ctx: TesterContext) {
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

        ctx.addMetric({
            group: 'speed',
            name: 'tti',
            label: 'time to interactive',
            value: getValue(lhr, 'interactive'),
        });
        ctx.addMetric({
            group: 'speed',
            name: 'fcp',
            label: 'first-contentful-paint',
            value: getValue(lhr, 'first-contentful-paint'),
        });
        ctx.addMetric({
            group: 'speed',
            name: 'lcp',
            label: 'largest-contentful-paint',
            value: getValue(lhr, 'largest-contentful-paint'),
        });
        // ctx.addMetric({
        //     group: 'speed',
        //     name: 'ttfb',
        //     label: 'ttfb',
        //     value: getValue(lhr, 'largest-contentful-paint'),
        // });
    }
}
