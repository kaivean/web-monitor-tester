/**
 * @file 自定义Gatherer
 * @author kaivean
 */

import {Gatherer} from 'lighthouse';
import * as logger from '../lib/logger';

export = class Mycustom extends Gatherer {
    async afterPass(passContext, passLoadData) {
        try {
            const driver = passContext.driver;

            const PerformanceTiming = await driver.evaluateAsync('JSON.stringify(window.performance.timing)');

            const gatherOptions = passContext.options;

            if (gatherOptions.afterPass) {
                await gatherOptions.afterPass(passContext, passLoadData);
            }

            // const res = await driver.evaluateAsync(`{${a.toString()} return a();}`);
            return JSON.parse(PerformanceTiming);
        }
        catch (e) {
            logger.error(e);
        }
        return {};
    }
};
