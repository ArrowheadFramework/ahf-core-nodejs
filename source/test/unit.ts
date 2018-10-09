/**
 * Testing utilities.
 */

/**
 * A unit test suite, containing related tests.
 */
export interface Suite {
    /**
     * Name of test suite.
     */
    name: string;

    /**
     * Units of suite.
     */
    [test: string]: Test | string;
}

/**
 * A unit test.
 */
export type Test = () => PromiseLike<void> | void;

/**
 * The results of running a set of test suites.
 */
export interface Report {
    /// The number of failed tests.
    failed: number,

    /// The number of passed tests.
    passed: number,
}

/**
 * Runs given unit test suites and reports on any results.
 *
 * @param suites Unit test suites to execute.
 */
export async function runSuites(...suites: Suite[]): Promise<Report> {
    let report: Report = {failed: 0, passed: 0};
    for (let suite of suites) {
        console.log("> " + suite.name);

        let keys = Object.keys(suite);
        for (let i = keys.length - 1; i-- != 0;) {
            const j = Math.floor(Math.random() * (i + 1));
            [keys[i], keys[j]] = [keys[j], keys[i]];
        }

        for (let key of keys) {
            try {
                let value = suite[key];
                if (typeof value !== 'function') {
                    continue;
                }
                await value();
                report.passed += 1;
                console.log("  - PASS " + key);
            }
            catch (error) {
                report.failed += 1;
                console.log("  - FAIL " + key +
                    (error.message ? (": " + error.message) : "")
                );
            }
        }
        console.log();
    }
    console.log("< Test Results");
    console.log("  - Failed tests:  " + report.failed);
    console.log("  - Passed tests:  " + report.passed);
    console.log();
    return report;
}