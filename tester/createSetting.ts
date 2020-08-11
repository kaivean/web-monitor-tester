/**
 * @file 自定义配置
 * @author kaivean
 */

import path from 'path';
import {getRootDir} from '../lib/util';

export default function createSetting(opt: any = {}) {
    return {
        // 1. Run your custom tests along with all the default Lighthouse tests.
        extends: 'lighthouse:default',

        // 2. Add gatherer to the default Lighthouse load ('pass') of the page.
        passes: [{
            passName: 'defaultPass',
            gatherers: [
                {
                    path: path.join(getRootDir(), 'dist/tester/mycustomGather'),
                    options: {
                        afterPass: opt.afterPass,
                    },
                },
            ],
        }],

        // 3. Add custom audit to the list of audits 'lighthouse:default' will run.
        audits: [
            path.join(getRootDir(), 'dist/tester/mycustomAudit'),
        ],

        // 4. Create a new section in the default report for our results.
        categories: {
            mycustom: {
                title: 'mycustom metrics',
                description: 'mycustom',
                auditRefs: [
                    // When we add more custom audits, `weight` controls how they're averaged together.
                    {id: 'mycustom-audit', weight: 1},
                ],
            },
        },
    };
}
