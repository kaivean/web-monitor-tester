/**
 * @file
 * @author kaivean
 */

import fs from 'fs-extra';
import program from 'commander';

import {
    TesterOption,
} from '../lib/interface';

import tester from '../tester/main';
import * as logger from '../lib/logger';
import output from './output';

export default async function main(opts: {[key: string]: any}, args: string[]) {
    if (!args.length) {
        logger.error('至少需要一个指定一个url');
        program.outputHelp();
        return;
    }

    let extraHeader = {};
    if (opts.extraHeader) {
        extraHeader = JSON.parse(opts.extraHeader);
    }

    let wiseSizeAmdJson;
    if (opts.wiseSizeAmdJson && fs.existsSync(opts.wiseSizeAmdJson)) {
        wiseSizeAmdJson = await fs.readJSON(opts.wiseSizeAmdJson);
    }

    const conf: TesterOption = {
        urls: args,
        count: opts.count as number,
        concurrency: opts.concurrency as number,
        userAgent: opts.userAgent,
        extraHeader: extraHeader,
        cache: opts.cache,
        errorCheckNode4: opts.errorCheckNode4,
        wiseSizeAmdJson,
        async onTask(res, finishedTaskNum, totalTaskNum) {
            logger.info(`Progress: ${finishedTaskNum}/${totalTaskNum}`);
        },
    };

    let {taskResults, error} = await tester(conf);
    if (!taskResults) {
        logger.error(error);
        return;
    }

    // 获取运行成功的结果
    const successResults = taskResults.filter(a => !a.error);

    // 但凡有一条成功，也算成功
    if (!error && successResults.length) {
        output(successResults, conf);
        return;
    }

    // 任取一次错误
    logger.error(taskResults[0].error);
};
