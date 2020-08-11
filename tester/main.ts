/**
 * @file 分析模块入口
 * @author kaivean
 */


import workerFarm from 'worker-farm';
import * as logger from '../lib/logger';

import {
    TesterOption,
    TaskResult,
} from '../lib/interface';

import task from './task';

function runOne(workers, url, option, index: number): Promise<TaskResult> {
    return new Promise(resolve => {
        // option.singleThread = true;
        // 不用多进程架构，仅Promise并发，便于debug调试等
        if (option.singleThread) {
            task({url, option}, function (err, result) {
                result = result || {};
                result.url = url;
                result.option = option;
                result.index = index;
                if (err) {
                    result.error = err;
                    resolve(result);
                    return;
                }
                resolve(result);
            });
            return;
        }

        workers({url, option}, function (err, result) {
            result = result || {};
            result.url = url;
            result.option = option;
            result.index = index;
            if (err) {
                result.error = err;
                resolve(result);
                return;
            }
            resolve(result);
        });
    });
}

export = async function main(option: TesterOption) {
    const startTime = Date.now();
    let taskResults: TaskResult[] = [];
    const urls = option.urls;

    const count = option.count || 1; // 每个url运营的次数
    const concurrency = option.concurrency || 1;
    const totalTaskNum = option.urls.length * count;
    // 创建多个进程，类似于雇佣多个工人， 后续放入的任务会分配给这些工人
    const workers = workerFarm({
        maxCallTime: 1200000, // 单个任务的最大运行时间
        maxCallsPerWorker: 1, // 单个工人（进程数）的同时运行的最大任务数，一般一个工人同时就做一件事
        maxConcurrentWorkers: concurrency, // 同时运行的最大工人数（进程数），默认是cpus核数
        maxConcurrentCalls: totalTaskNum, // 任务队列的最大数量
        maxRetries: 0, // 单个任务失败，重试运行次数
        onChild(child) {
            if (option.onChild) {
                option.onChild(child);
            }
        },
    } as any, require.resolve('./task'));

    try {
        const pendingTasks: Array<Promise<TaskResult>> = [];

        let finishedTaskNum = 0;

        if (option.onTask) {
            await option.onTask(null, finishedTaskNum, totalTaskNum);
        }

        const runEvery = (url, j) => {
            logger.info(`Running ${j}/${count}: ${url}`);
            pendingTasks.push(
                runOne(workers, url, option, j).then(async (res: TaskResult) => {
                    finishedTaskNum++;
                    if (option.onTask) {
                        await option.onTask(res, finishedTaskNum, totalTaskNum);
                    }
                    if (res.error) {
                        logger.error(`Error task: ${j}/${count}: ${url}`);
                        logger.error(res.error);
                    }
                    else {
                        logger.info(`Finished task: ${j}/${count}: ${url}`);
                    }
                    return res;
                })
            );
        };

        for (let j = 1; j <= count; j++) {
            for (let i = 0; i < urls.length; i++) {
                runEvery(urls[i], j);
            }
        }

        // 等待任务执行
        logger.warn('Waiting for completing the above task');
        taskResults = await Promise.all(pendingTasks);

        const obj = {};
        for (const res of taskResults) {
            if (!obj[res.url]) {
                obj[res.url] = [];
            }
            obj[res.url].push(res);
        }

        for (const url of Object.keys(obj)) {
            obj[url].sort((a, b) => a.index - b.index);
            console.log('------------------------------');
            console.log('url: ', url);
            for (const res of obj[url]) {
                if (res.status) {
                    logger.error(`Failed task: ${res.index}/${count}`);
                }
                else {
                    logger.info(`Successful task: ${res.index}/${count}`);
                }
            }
        }
        console.log('Total time: ', Date.now() - startTime, 'ms');
    }
    catch (e) {
        logger.error(e);
        return {error: e};
    }
    finally {
        // 关闭这些工人
        workerFarm.end(workers);
    }

    return {taskResults};
};
