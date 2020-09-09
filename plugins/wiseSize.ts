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
     * @param {PluginOption} plugOpt 浏览器实例
     */
    async onInited() {

    }

    /**
     * 插件钩子，当评测过程-浏览器实例初始化后
     * @param {} 浏览器实例
     * @param {} puppeteer
     */
    async onBrowserInited(ctx: TesterContext) {
        ctx.runLighthouse = true;
    }

    /**
     * 插件钩子，当评测过程-lighthouse加载页面后，执行数据采集时，此时页面还未关闭
     * 可以通过 ctx.lighthousePage 访问， ctx.passContext 和 ctx.passLoadData访问已经采集的数据
     *
     * @param {} 浏览器实例
     * @param {} puppeteer
     */
    async onLighthouseAfterPass(ctx: TesterContext) {
        const amdJson = ctx.testerOption.wiseSizeAmdJson || [];

        const records = ctx.passLoadData.networkRecords;
        const sizeObj = {};
        for (const record of records) {
            if (!record.url.startsWith('http')) {
                continue;
            }
            if (record.resourceType === 'Document') {
                continue;
            }

            sizeObj[record.url] = {
                name: record.url,
                decodedBodySize: record.resourceSize,
                initiatorType: record.resourceType === 'Image' ? 'img' : 'other',
            };
        }

        const page = ctx.lighthousePage;

        // 插入脚本进行分析
        const {statData, cardNumObj} = await page.evaluate((amdJson: any[], sizeObj: any) => {
            performance.mark('wiseSizeStart');
            function getxpath(el: Element | null) {
                if (!el) {
                    return {};
                }
                const xpath: string[] = [];
                let tplName = '';
                while (el && el.nodeType === 1 && el !== el.parentNode) {
                    xpath.push(el.tagName.toLowerCase());
                    // 到卡片根元素就中止
                    if (el.classList.contains('c-result') && el.getAttribute('tpl')) {
                        tplName = el.getAttribute('tpl') || '';
                        break;
                    }
                    else if (el.classList.contains('ec_wise_ad')) {
                        tplName = 'ecom';
                        break;
                    }

                    if (el === document.body) {
                        break;
                    }
                    el = el.parentNode as Element; // 修复缺陷检查
                }
                return {
                    xpath: xpath.join('<'),
                    tplName: tplName,
                };
            }

            const resourceMatch = [
                // External Link bunlde
                {
                    business: 'www-wise',
                    name: 'globalT',
                    match: /static\/js\/iphone\/globalT/,
                },
                {
                    business: 'www-wise',
                    name: 'zbiosT',
                    match: /static\/js\/iphone\/zbios\/zbiosT/,
                },
                {
                    business: 'www-wise',
                    name: 'globalB1',
                    match: /static\/js\/iphone\/globalB1/,
                },
                {
                    business: 'www-wise',
                    name: 'globalB2',
                    match: /static\/js\/iphone\/globalB2/,
                },
                {
                    business: 'www-wise',
                    name: 'globalB3',
                    match: /static\/js\/iphone\/globalB3/,
                },
                {
                    business: 'www-wise',
                    name: 'zbios',
                    match: /static\/js\/iphone\/zbios\/zbios/,
                },
                {
                    business: 'www-wise',
                    name: 'frame',
                    match: /static\/js\/iphone\/frame/,
                },
                {
                    business: 'www-wise',
                    name: 'foot',
                    match: /static\/js\/iphone\/zbios\/foot/,
                },
                {
                    business: 'www-wise',
                    name: 'invokeApp',
                    match: /static\/js\/iphone\/zbios\/android_invokeApp/,
                },
                {
                    business: 'fusion',
                    name: 'fusionBundle',
                    match: /static\/js\/iphone\/async\/fusion_bundle/,
                },
                {
                    business: 'www-wise',
                    name: 'libBundle',
                    match: /static\/js\/iphone\/async\/lib_bundle/,
                },
                {
                    business: 'www-wise',
                    name: 'moduleBundle',
                    match: /static\/js\/iphone\/async\/module_bundle/,
                },


                {
                    business: 'ecom',
                    name: 'hector',
                    match: /hectorstatic\.baidu\.com/,
                },
                {
                    business: 'ecom',
                    name: 'static',
                    match: /\/static\/ecom\//,
                },

                // AMD
                {
                    business: 'search-ui', // 按路径匹配，要在atom业务之前匹配
                    name: 'search-ui',
                    match: /static\/atom\/search-ui\//,
                },
                {
                    business: 'lego',
                    name: 'lego',
                    match: /static\/atom\/lego/,
                },
                {
                    business: 'atom',
                    name: 'atom',
                    match: /static\/atom\//,
                },
                {
                    business: 'atom',
                    name: 'alaUtil',
                    match: /\/se\/static\/js\/bundles\/ala-util/,
                },
                {
                    business: 'pmd',
                    name: 'font',
                    match: /static\/font\/pmd\/cicon/,
                },
                {
                    business: 'growth',
                    name: 'js',
                    match: /static\/growthbox\/rmbgrowthbox/,
                },

                // card
                {
                    match(item: PerformanceResourceTiming) {
                        if (item.name) {
                            const res = /\/static\/ala_atom\/app\/(.*?)\//.exec(item.name);
                            if (res) {
                                const cardName = res[1];
                                let name = 'js';
                                let business = 'card-' + cardName;
                                // if (['h5_mobile'].includes(cardName)) {
                                //     business = 'www';
                                // }
                                // card name
                                return {
                                    business,
                                    name,
                                };
                            }
                        }
                        return;
                    },
                },

                // molecules
                {
                    match(item: PerformanceResourceTiming) {
                        if (item.name) {
                            const res = /\/static\/molecules\/(.*?)\//.exec(item.name);
                            if (res) {
                                const moleculesName = res[1];
                                let name = 'js';
                                let business = moleculesName;
                                // if (['h5_mobile'].includes(moleculesName)) {
                                //     business = 'www';
                                // }
                                // molecules name
                                return {
                                    business,
                                    name,
                                };
                            }
                        }
                        return;
                    },
                },

                // amd
                {
                    match(item: PerformanceResourceTiming) {
                        if (item.name) {
                            for (const modConf of amdJson) {
                                const re1 = new RegExp(`/static/amd_modules/${modConf.amd}_`);
                                const re2 = new RegExp(`/static/amd_modules/${modConf.amd}/`);
                                if (re1.test(item.name) || re2.test(item.name)) {
                                    return {
                                        business: modConf.business,
                                        name: `${modConf.amd}.js`,
                                    };
                                }
                            }
                        }
                        return;
                    },
                },

                // img
                {
                    match(item: PerformanceResourceTiming) {
                        if (!['img', 'css'].includes(item.initiatorType.toLowerCase())) {
                            return;
                        }
                        const urlobj = new URL(item.name);
                        const pathsearch = urlobj.pathname + urlobj.search;
                        let img = document.body.querySelector('[src*="' + pathsearch + '"]');
                        if (!img) {
                            img = document.body.querySelector('[style*="' + pathsearch + '"]');
                        }
                        if (!img) {
                            // console.log('没有匹配到元素, 图片:', item.name);
                            return;
                        }
                        const data = getxpath(img);
                        const cardName = data.tplName;
                        let business = 'www-wise';
                        let name = 'img';

                        if (cardName === 'ecom') {
                            business = 'ecom';
                        }
                        else if (cardName) {
                            name = 'img';
                            business = 'card-' + cardName;
                        }


                        return {
                            business,
                            name,
                        };
                    },
                },

                // 兜底的，static/js 默认下面都是www-wise外链
                {
                    business: 'www-wise',
                    name: 'js',
                    match: /static\/js\//,
                },

                // 兜底的，一些写在css的图片请求到卡片，无法归类，只能靠路径归类
                {
                    business: 'aladdin',
                    name: 'other',
                    match: /static\/ala_atom\//,
                },
            ];

            // 忽略图片
            // 下述图片路径往往是用来进行日志统计，不是正常图片
            const ignoredPaths = [
                '/w.gif',
                '/mwb.gif',
                '/mwb2.gif',
                '/tc?',
                '/tcbox?',
                '/hm.gif?',
                '/webb.gif',
                '/static/az.gif',
                '/speed/static/tj.gif',
                '/5b1ZeDe5KgQFm2e88IuM_a/wbcj.gif',
            ];

            function ignorePath(link: string) {
                return ignoredPaths.some(item => link.includes(item));
            }


            const statData: any = {
                _: 0,
            };

            function addStatData(name: string, value: number, infos: string[] = []) {
                const arr = name.split('.');
                const first = arr[0];
                const second = arr[1];
                const third = arr[2];

                value = +(value / 1024).toFixed(1);

                statData._ += value;

                if (!statData[first]) {
                    statData[first] = {
                        _: 0,
                        _info: [],
                    };
                }

                statData[first]._ += value;
                statData[first]._info.push(infos);

                if (second) {
                    if (!statData[first][second]) {
                        statData[first][second] = {
                            _: 0,
                            _info: [],
                        };
                    }

                    statData[first][second]._ += value;
                    statData[first][second]._info.push(infos);
                }

                if (third) {
                    if (!statData[first][second][third]) {
                        statData[first][second][third] = {
                            _: 0,
                            _info: [],
                        };
                    }
                    statData[first][second][third]._ += value;
                    statData[first][second][third]._info.push(infos);
                }
            }

            let cardNumObj = {};
            // 获取卡片的html和data
            const cardRootEles = document.querySelectorAll('#results > .c-result');
            for (let index = 0; index < cardRootEles.length; index++) {
                const ele = cardRootEles[index];
                const contentEle = ele.querySelector('.c-result-content');
                if (!contentEle) {
                    continue;
                }
                const atomRootEle = contentEle.firstElementChild;
                if (!atomRootEle) {
                    continue;
                }
                const cardName = ele.getAttribute('tpl');
                if (!cardName) {
                    continue;
                }

                if (!cardNumObj[cardName]) {
                    cardNumObj[cardName] = 0;
                }
                cardNumObj[cardName]++;

                let business = 'card-' + cardName;
                addStatData(`${business}.html`, atomRootEle.innerHTML.length);

                for (let i = 0; i < atomRootEle.attributes.length; i++) {
                    const attr = atomRootEle.attributes[i];
                    if (attr.name.startsWith('atom-root-')) {
                        const hash = attr.name.split('atom-root-')[1];
                        const id = `atom-data-${hash}`;
                        const ele = document.getElementById(id);
                        if (ele) {
                            addStatData(`${business}.data`, ele.innerHTML.length);
                        }
                    }
                }
            }

            // 获取卡片css
            const styleEles = document.querySelectorAll('#results style[data-vue-ssr-id]');
            for (let index = 0; index < styleEles.length; index++) {
                const ele = styleEles[index];
                // 所有奇数项是卡片名
                const arr = ele.innerHTML.split(/\/\*\s*(.*?):\d+\s*\*\//);

                for (let i = 1; i < arr.length; i = i + 2) {
                    const cardName = arr[i];
                    const cssContent = arr[i + 1];
                    let business = 'card-' + cardName;
                    addStatData(`${business}.css`, cssContent.length);
                }
            }

            // 获取network资源
            // const {0: mainPageTiming} = performance.getEntriesByType('navigation');
            // const resourceTimings = performance.getEntriesByType('resource');
            const resourceTimings = Object.keys(sizeObj).map(name => sizeObj[name]);
            const handleTiming = (timing: PerformanceResourceTiming, realSize: number) => {
                for (const item of resourceMatch) {
                    if (typeof item.match === 'function') {
                        const res = item.match(timing);
                        if (res) {
                            addStatData(`${res.business}.${res.name}`, realSize, [timing.name]);
                            return true;
                        };
                    }
                    else if (item.match.test(timing.name)) {
                        addStatData(`${item.business}.${item.name}`, realSize, [timing.name]);
                        return true;
                    }
                }
                return false;
            };

            const len = resourceTimings.length;
            for (let i = 0; i < len; i++) {
                const timing = resourceTimings[i] as PerformanceResourceTiming;
                if (ignorePath(timing.name)) {
                    continue;
                }

                // 因为在浏览器获取的resourceTimings的decodedBodySize受到跨域影响，有些资源是拿不到size的
                // 所以把lighthouse采集的真实size传过来
                let realSize = timing.decodedBodySize;

                if (!realSize) {
                    console.log('未有该请求真实size', timing.name);
                    continue;
                }

                if (!handleTiming(timing, realSize)) {
                    // 看起来还是有点内容的请求，需要处理归类好，否则可以忽略
                    console.log('未能处理请求', timing.name);
                    addStatData('unkown', realSize, [timing.name]);
                }
            }

            // 获取点后退数据的体积
            const aftclkEles = document.querySelectorAll('script[data-name=aftclk]');
            for (let i = 0; i < aftclkEles.length; i++) {
                const aftclkEle = aftclkEles[i];
                addStatData('aftclk.data', aftclkEle.innerHTML.length);
            }


            // 获取主文档输出的体积
            const statEles = document.querySelectorAll('script.size-stat');
            if (statEles.length) {
                for (let i = 0; i < statEles.length; i++) {
                    const statEle = statEles[i];
                    const stat = JSON.parse(statEle.innerHTML);
                    for (const k of Object.keys(stat)) {
                        for (const v of stat[k]) {
                            addStatData(k, v);
                        }
                    }
                }
            }
            else {
                console.log('no stat element');
            }

            performance.mark('wiseSizeEnd');
            performance.measure('wiseSizeHandleTime', 'wiseSizeStart', 'wiseSizeEnd');

            return {
                statData,
                cardNumObj,
            };
        }, amdJson, sizeObj);

        for (const first of Object.keys(statData)) {
            for (const second of Object.keys(statData[first])) {
                let item;
                let name = '';
                if (second === '_') {
                    item = statData[first];
                    name = first;
                }
                else if (second === '_info') {

                }
                else {
                    item = statData[first][second];
                    name = `${first}.${second}`;
                }

                if (item) {
                    let infos = [];
                    for (const info of item._info) {
                        infos = infos.concat(info);
                    }
                    // 卡片要取均值
                    if (first.startsWith('card-')) {
                        const cardName = first.split('.')[0].split('-')[1];
                        if (cardNumObj[cardName]) {
                            item._ = item._ / cardNumObj[cardName];
                        }
                    }
                    ctx.addMetric({
                        group: 'wiseSize',
                        name,
                        value: item._,
                        info: infos,
                    });
                }
            }
        }

        // console.log('statData', statData);
    }

    /**
     * 插件钩子，当评测过程-已执行完lighthouse
     * @param {ctx: TesterContext} ctx 上下文
     */
    async onTested(ctx: TesterContext) {
        if (!ctx.browser) {
            return;
        }
    }
}
