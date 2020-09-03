/**
 * @file 将整理好的数据生成html文件
 * @author kaivean
 */


import path from 'path';
import fs from 'fs-extra';
import moment from 'moment';
import md5 from 'md5';
import * as logger from '../lib/logger';
import {
    TesterOption,
    TaskResult,
} from '../lib/interface';
import {
    getRootDir,
} from '../lib/util';


const sum = (x: number, y: number) => x + y;
const square = (x: number) => x * x;

function aggrMetrics(metricsArr) {
    const tmp = {};
    const newMetrics: any[] = [];
    for (const metrics of metricsArr) {
        for (const item of metrics) {
            if (!tmp[item.group]) {
                tmp[item.group] = {};
            }
            if (!tmp[item.group][item.name]) {
                tmp[item.group][item.name] = {
                    dataPoints: [],
                    item,
                };
            }
            tmp[item.group][item.name].dataPoints.push(item.value);
            tmp[item.group][item.name].item = item;
        }
    }
    for (const group of Object.keys(tmp)) {
        const children: any[] = [];
        for (const name of Object.keys(tmp[group])) {
            const dataPoints = tmp[group][name].dataPoints;
            const item = tmp[group][name].item;
            // 平均值
            const mean = dataPoints.reduce(sum) / dataPoints.length;
            const deviations = dataPoints.map(x => x - mean);
            // 总体标准差
            const stddev = Math.sqrt(deviations.map(square).reduce(sum) / dataPoints.length);
            children.push({
                group,
                name,
                label: item.label,
                info: item.info,
                dataPoints,
                value: +mean.toFixed(1),
                stddev: +stddev.toFixed(1),
            });
        }
        newMetrics.push({
            group,
            children,
        });
        children.sort((a, b) => {
            return a.name >  b.name ? 1 : -1;
        });
    }
    return newMetrics;
}

export default async function (taskResults: TaskResult[], option: TesterOption) {
    const metrics = aggrMetrics(taskResults.map(item => item.metrics).filter(a => a));

    let html = await fs.readFile(path.resolve(getRootDir(), 'cli', 'output.html'), 'utf8');
    html = html.replace('TPLDATA', JSON.stringify({
        option,
        metrics,
        screenshot: taskResults[0].screenShot,
    }));

    const time = moment().format('YYYY_MM_DD_HH_mm_ss');
    const name = `${md5(option.urls.join(','))}_${time}.html`;
    fs.writeFileSync(name, html);

    logger.info(`Save results to the html file : ${name}`);
};
