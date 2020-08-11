/**
 * @file 插件调度
 * @author kaivean
 */

import SpeedPlugin from '../plugins/speed';
import LagPlugin from '../plugins/lag';
import SizePlugin from '../plugins/size';
import WiseSizePlugin from '../plugins/wiseSize';
import ImgoptPlugin from '../plugins/imgopt';
import ErrorCheckPlugin from '../plugins/errorCheck';

import Plugin from '../plugins/plugin';

const defaultUsedPluginClassNames = ['speed', 'lag', 'size', 'imgopt', 'errorCheck'];

const plugMap = {
    speed: SpeedPlugin,
    lag: LagPlugin,
    size: SizePlugin,
    wiseSize: WiseSizePlugin,
    imgopt: ImgoptPlugin,
    errorCheck: ErrorCheckPlugin,
};

export default class Scheduler {
    plugins: Plugin[] = [];

    static register(name: string, plug: Plugin) {
        plugMap[name] = plug;
    }

    select(names = defaultUsedPluginClassNames) {
        for (const name of names) {
            const Plug = plugMap[name];
            if (Plug) {
                this.plugins.push(new Plug());
            }
        }
    }

    async dispatch(event: string, param: any) {
        for (const plug of this.plugins) {
            (plug as any)[event] && await (plug as any)[event](param);
        }
    }
}
