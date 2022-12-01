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
        if (ctx.testerOption.scroll) {
            try {
                const page = await ctx.browser.newPage();
                await page.setJavaScriptEnabled(true),

                await page.goto(ctx.url, {
                    timeout: 30000, // 单位ms, 默认30s，设置0禁用
                });
                // 等待3秒
                await new Promise(r => setTimeout(r, 3000));
                const {longtaskRate} = await page.evaluate(async () => {
                    return new Promise(resolve => {
                        let monitor = window.__monitor || {};
                        let entryType = 'longtask';
                        // long task 类
                        let Longtask = /** @class */ (function () {
                            function Longtask() {
                                let _this = this;
                                this.lts = [];
                                this.observer = null;
                                if (!window.PerformanceObserver) {
                                    return;
                                }
                                if (monitor && monitor.pos && monitor.pos[entryType]) {
                                    this.lts = this.lts.concat(monitor.pos[entryType]);
                                }
                                try {
                                    this.observer = new PerformanceObserver(function (list) {
                                        _this.lts = _this.lts.concat(list.getEntries());
                                    });
                                    // buffered 兼容性太差
                                    this.observer.observe({entryTypes: [entryType]});
                                }
                                catch (e) {
                                    return;
                                }
                            }
                            Longtask.prototype.getStatData = function (startTime, finalTime = Date.now()) {
                                if (!(performance && performance.timing && performance.timing.navigationStart)) {
                                    return {};
                                }
                                let longtaskTime = 0;
                                let longtaskNum = 0;
                                let navigationStart = performance.timing.navigationStart;
                                if (!startTime) {
                                    startTime = navigationStart;
                                }
                                for (let index = 0; index < this.lts.length; index++) {
                                    let item = this.lts[index];
                                    let duration = item.duration;
                                    let taskStart = navigationStart + item.startTime;
                                    let taskfinal = navigationStart + item.startTime + duration;
                                    // 仅收集在滚动期间结束的long task，包括部分duration在滚动期间的long task
                                    if ((taskStart > startTime && taskStart < finalTime) || (taskfinal > startTime && taskfinal > startTime)) {
                                        // 开始时间早于滚动开始时间的long task，仅记录滚动期间的 duration
                                        if (taskStart < startTime) {
                                            longtaskTime += taskfinal - startTime;
                                        // 结束时间晚于滚动结束时间的long task，仅记录滚动期间的 duration
                                        } else if (taskfinal > finalTime) {
                                            longtaskTime += finalTime - taskStart;
                                        // 开始和结束时间均在滚动期间的long task，记录全部的 duration
                                        } else {
                                            longtaskTime += duration;
                                        }
                                        longtaskNum++;
                                    }
                                }
                                return {
                                    longtaskNum: longtaskNum,
                                    longtaskTime: longtaskTime,
                                    longtaskRate: 100 * longtaskTime / (finalTime - startTime),
                                };
                            };
                            return Longtask;
                        }());
                        const lt = new Longtask();
                        const startTime = Date.now();
                        let i = 0;
                        // 滚动5次
                        while (i++ < 5) {
                            setTimeout(() => {
                                window.scrollBy(0, document.body.scrollHeight);
                            }, 5000 * i);
                        }
                        setTimeout(() => {
                            console.log(lt.lts);
                            console.log(lt.getStatData(startTime));
                            resolve(lt.getStatData(startTime));
                        }, 5000 * i);
                    });
                });
                ctx.addMetric({
                    group: 'lag',
                    name: 'scroll-longTask-ratio',
                    label: 'scroll-longTask-ratio',
                    value: longtaskRate,
                });
                // 关闭该页面
                await page.close();
            } catch (error) {
                console.log(error);
            }
        }
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
