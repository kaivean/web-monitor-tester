// import puppeteer from 'puppeteer';

// import { lchmod } from "fs-extra";

// // 只能在 模块 内才能使用 declare global 语法，纯声明文件，默认就是global的定义
// // 一旦.d.ts文件有import，那么该.d.ts也会认为是模块
// declare global {
//     namespace WMT {
//         interface ProgramArgv {
//             [key: string]: any;
//         }

//         interface TesterOption {
//             /**
//              * 页面地址
//              */
//             url: string;

//             /**
//              * 页面运行次数
//              */
//             count?: number;

//             /**
//              * node 4.x 命令路径，比如：xxx/node4.8/bin/node
//              */
//             node4?: string;

//             /**
//              * header
//              */
//             extraHeader?: string;

//             /**
//              * 页面head执行前在页面里执行的JS
//              */
//             customJsBeforeHead?: string;

//             /**
//              * 页面load后在页面里执行的JS
//              */
//             customJsAfterLoad?: string;
//         }

//         interface PluginOption {
//             browser?: puppeteer.Browser;
//         }
//     }
// }

declare module 'lighthouse' {
    export default function (url: string, flag: LH.Flags, config?: any): Promise<LH.RunnerResult>;

    export class Audit {
        a;
    }
    export class Gatherer {
        a;
    }
    // export type Gatherer = LH.Gatherer;
    // export module Gatherer: typeof LH.Gatherer;
    // export type Gatherer extends LH.Gatherer;
}

declare module 'webp-converter' {
    export function gwebp(file: string, newfile: string, opt: any): Promise<string>;
    export function cwebp(file: string, newfile: string, opt: any): Promise<string>;
}
