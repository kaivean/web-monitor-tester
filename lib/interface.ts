/**
 * @file interface
 * @author kaivean
 */

import {ChildProcess} from 'child_process';
import puppeteer from 'puppeteer';

export interface ProgramArgv {
    [key: string]: any;
}

export interface TesterOption {
    /**
     * 页面地址
     */
    urls: string[];

    /**
     * 页面运行次数
     */
    count?: number;

    /**
     * 并发数
     */
    concurrency?: number;

    /**
     * userAgent
     */
    userAgent?: string;

    /**
     * 是否在有缓存的前提测试
     */
    cache?: boolean;

    /**
     * header
     */
    extraHeader?: any;

    /**
     * 页面head执行前在页面里执行的JS
     */
    // customJsBeforeHead?: string;

    /**
     * 页面load后在页面里执行的JS
     */
    // customJsAfterLoad?: string;

    saveLog?: boolean;

    saveLogDir?: string;

    customPluginPaths?: string[];

    plugins?: string[];

    onTask?: (res: TaskResult | null, finishedTaskNum: number, totalTaskNum: number) => Promise<void>;
    onChild?: (child: ChildProcess) => Promise<void>;

    /**
     * only for plugin errorCheck
     * node 4.x 命令路径，比如：xxx/node4.8/bin/node
     */
    errorCheckNode4?: string;

    /**
     * only for plugin wiseSize
     */
    wiseSizeAmdJson?: any[];
}

export interface TaskResult {
    cost: number;
    error: Error | null;
    metrics: Metric[] | null;
    traces: any;
    networks: any;
    mainDocument: string | null;
    screenShot: any;
    url: string;
    index: number;
    option: TesterOption;
}

export interface TesterResult {
    cost: number;
    error: Error | null;
    metrics: Metric[] | null;
    traces: any;
    networks: any;
    mainDocument: string | null;
    screenShot: any;
}

export interface PluginOption {
    url?: string;
    testerOption: TesterOption;
    browser?: puppeteer.Browser;
    flag?: LH.Flags;
    lhr?: LH.RunnerResult;
}


export interface Metric {
    group: string;
    name: string;
    label?: string;
    value: number;
    info?: any;
}
