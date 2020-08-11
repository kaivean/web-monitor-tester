/**
 * @file 自定义Audit
 * @author kaivean
 */

import {Audit} from 'lighthouse';

export = class MycustomAudit extends Audit {
    static get meta() {
        return {
            id: 'mycustom-audit',
            title: 'mycustom-audit',
            failureTitle: 'mycustom-audit fail',
            description: 'get Mycustom',

            // We mention here our custom gatherer
            requiredArtifacts: ['Mycustom'], // gatherer的类名
        };
    }

    static audit(artifacts) {
        const timing = artifacts.Mycustom as PerformanceTiming;

        // This score will be binary, so will get a red ✘ or green ✓ in the report.
        return {
            rawValue: timing.loadEventEnd,
            // Cast true/false to 1/0
            score: Number(1),
        };
    }
};
