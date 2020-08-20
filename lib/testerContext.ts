
/**
 * @file 插件-卡顿评测
 * @author kaivean
 */

import path from 'path';
import moment from 'moment';
import fs from 'fs-extra';

import puppeteer from 'puppeteer';
import md5 from 'md5';
import {
    // PluginOption,
    TesterOption,
    Metric,
} from '../lib/interface';

import {getHomeDir} from '../lib/util';

/**
 * 插件是指在一个页面的一次评测过程中实现某一项独立的评测功能
 */
export default class TesterContext {
    url: string = '';
    testerOption: TesterOption;
    launchOpt: any;
    runLighthouse = false;
    browser: puppeteer.Browser;
    flag: LH.Flags = {};
    page: puppeteer.Page;
    runnerResult: LH.RunnerResult | null;
    metrics: Metric[] = [];
    runningLighthouse = false;
    lighthousePage: puppeteer.Page; // lighthouse在defaultPass里打开的page
    passContext: any;
    passLoadData: any;
    taskDir = '';
    constructor(url: string, testerOption: TesterOption) {
        this.url = url;
        this.testerOption = testerOption;
        const time = moment().format('YYYY_MM_DD_HH_mm_ss');
        const rand = (Math.random() * 1000).toFixed();
        this.taskDir = getHomeDir(`${time}_${rand}_${md5(url)}`);
    }

    async getDir(sub = '') {
        const dir = path.join(this.taskDir, sub || '');
        await fs.ensureDir(dir);
        return this.testerOption.saveLogDir || dir;
    }

    addMetric(item: Metric) {
        // 保留一位小数
        item.value = +item.value.toFixed(1).replace('.0', '');
        this.metrics.push(item);
    }

    getMetric() {
        return this.metrics;
    }
}
