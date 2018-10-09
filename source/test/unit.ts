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
 * Runs given unit test suites, reports on any results and exists.
 *
 * @param suites Unit test suites to execute.
 */
export async function runSuitesAndExit(...suites: Suite[]) {
    let failed = 0;
    let passed = 0;

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
                passed += 1;
                console.log("  - PASS " + key);
            }
            catch (error) {
                failed += 1;
                console.log("  - FAIL " + key +
                    (error.message ? (": " + error.message) : "")
                );
            }
        }
        console.log();
    }
    console.log("< Test Results");
    console.log("  - Failed tests:  " + failed);
    console.log("  - Passed tests:  " + passed);
    console.log();

    process.exit(failed === 0 ? 0 : 1)
}