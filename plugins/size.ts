/**
 * @file 插件-卡顿评测
 * @author kaivean
 */

import TesterContext from '../lib/testerContext';

import Plugin from './plugin';

/**
 * 插件是指在一个页面的一次评测过程中实现某一项独立的评测功能
 */
export default class WiseSizePlugin extends Plugin {
    // constructor() {
    //     super();
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
        if (!ctx.runnerResult) {
            return;
        }

        let inlineScriptSize = 0;
        // let inlineScriptLength = 0;
        let inlineDataSize = 0;
        // let inlineDataLength = 0;
        const eles = ctx.runnerResult.artifacts.ScriptElements;
        for (const eleItem of eles) {
            // 非外链的JS
            if (
                !eleItem.src
                && eleItem.content
                && (!eleItem.type || eleItem.type.includes('javascript'))
            ) {
                inlineScriptSize += eleItem.content.length;
                // inlineScriptLength++;
            }
            // application/json
            else if (eleItem.content && (eleItem.type || '').includes('json')) {
                inlineDataSize += eleItem.content.length;
                // inlineDataLength++;
            }
        }

        let inlineStyleSize = 0;
        const stylesheets = ctx.runnerResult.artifacts.CSSUsage.stylesheets;
        for (const eleItem of stylesheets) {
            // 随主文档内联下发的
            if (eleItem.header.isInline && eleItem.content) {
                inlineStyleSize += eleItem.content.length;
            }
        }

        ctx.addMetric({
            group: 'size',
            name: 'inlineScriptSize',
            label: 'inlineScriptSize',
            value: inlineScriptSize / 1024,
        });
        ctx.addMetric({
            group: 'size',
            name: 'inlineDataSize',
            label: 'inlineDataSize',
            value: inlineDataSize / 1024,
        });
        ctx.addMetric({
            group: 'size',
            name: 'inlineStyleSize',
            label: 'inlineStyleSize',
            value: inlineStyleSize / 1024,
        });

        const info = {
            allCount: 0,
            allTransferSize: 0,
            allSize: 0,
            documentTransferSize: 0,
            documentSize: 0,
            imageSize: 0,
            imageCount: 0,
            imageTransferSize: 0,
            styleCount: 0,
            styleTransferSize: 0,
            styleSize: 0,
            fontCount: 0,
            fontTransferSize: 0,
            fontSize: 0,
            scriptCount: 0,
            scriptTransferSize: 0,
            scriptSize: 0,
        };

        const lhr = ctx.runnerResult.lhr;
        // 分析网络请求
        lhr.audits['network-requests']
        && lhr.audits['network-requests'].details
        && (lhr.audits['network-requests'].details as LH.Audit.Details.Table).items
        && (lhr.audits['network-requests'].details as LH.Audit.Details.Table).items.forEach(item => {
            if (!(item && item.resourceType)) {
                return;
            }
            const transSize = item.transferSize as number / 1024;
            const resSize = item.resourceSize as number / 1024;
            info.allCount++;
            info.allTransferSize += transSize;
            info.allSize += resSize;
            switch ((item.resourceType as string).toLowerCase()) {
                case 'document':
                    info.documentTransferSize = info.documentTransferSize || transSize;
                    info.documentSize = info.documentSize || resSize;
                    break;
                case 'script':
                    info.scriptCount++;
                    info.scriptTransferSize += transSize;
                    info.scriptSize += resSize;
                    break;
                case 'image':
                    info.imageCount++;
                    info.imageTransferSize += transSize;
                    info.imageSize += resSize;
                    break;
                case 'stylesheet':
                    info.styleCount++;
                    info.styleTransferSize += transSize;
                    info.styleSize += resSize;
                    break;
                case 'font':
                    info.fontCount++;
                    info.fontTransferSize += transSize;
                    info.fontSize += resSize;
                    break;
            }
        });


        ctx.addMetric({
            group: 'size',
            name: 'allCount',
            label: 'allCount',
            value: info.allCount,
        });
        ctx.addMetric({
            group: 'size',
            name: 'allTransferSize',
            label: 'allTransferSize',
            value: info.allTransferSize,
        });
        ctx.addMetric({
            group: 'size',
            name: 'allSize',
            label: 'allSize',
            value: info.allSize,
        });
        ctx.addMetric({
            group: 'size',
            name: 'documentTransferSize',
            label: 'documentTransferSize',
            value: info.documentTransferSize,
        });
        ctx.addMetric({
            group: 'size',
            name: 'documentSize',
            label: 'documentSize',
            value: info.documentSize,
        });
        ctx.addMetric({
            group: 'size',
            name: 'scriptCount',
            label: 'scriptCount',
            value: info.scriptCount,
        });
        ctx.addMetric({
            group: 'size',
            name: 'scriptTransferSize',
            label: 'scriptTransferSize',
            value: info.scriptTransferSize,
        });
        ctx.addMetric({
            group: 'size',
            name: 'scriptSize',
            label: 'scriptSize',
            value: info.scriptSize,
        });
        ctx.addMetric({
            group: 'size',
            name: 'imageCount',
            label: 'imageCount',
            value: info.imageCount,
        });
        ctx.addMetric({
            group: 'size',
            name: 'imageTransferSize',
            label: 'imageTransferSize',
            value: info.imageTransferSize,
        });
        ctx.addMetric({
            group: 'size',
            name: 'imageSize',
            label: 'imageSize',
            value: info.imageSize,
        });
        ctx.addMetric({
            group: 'size',
            name: 'styleCount',
            label: 'styleCount',
            value: info.styleCount,
        });
        ctx.addMetric({
            group: 'size',
            name: 'styleTransferSize',
            label: 'styleTransferSize',
            value: info.styleTransferSize,
        });
        ctx.addMetric({
            group: 'size',
            name: 'styleSize',
            label: 'styleSize',
            value: info.styleSize,
        });
        ctx.addMetric({
            group: 'size',
            name: 'fontCount',
            label: 'fontCount',
            value: info.fontCount,
        });

        ctx.addMetric({
            group: 'size',
            name: 'fontTransferSize',
            label: 'fontTransferSize',
            value: info.fontTransferSize,
        });

        ctx.addMetric({
            group: 'size',
            name: 'fontSize',
            label: 'fontSize',
            value: info.fontSize,
        });
    }
}
