import { Recorder, Suite, Tester, Unit } from "./index";

/**
 * Unit tester that writes test results to console.
 */
export class ConsoleTester implements Tester {
    private readonly suites: Suite[];
    private readonly verbose: boolean;

    /**
     * Creates new console tester.
     * 
     * @param options Instance options.
     */
    public constructor(options: ConsoleTesterOptions = {}) {
        this.suites = [];
        this.verbose = options.verbose || false;
    }

    public register(suite: Suite) {
        this.suites.push(suite);
    }

    public run(): Promise<number> {
        let failCount = 0;
        let passCount = 0;
        let skipCount = 0;

        const executeUnit = (
            suite: Suite,
            unit: Unit,
            ...extras: any[]
        ): Promise<void> => new Promise(resolve => {
            let completed = false;
            let timeout;

            const tryComplete = (): boolean => {
                if (!completed) {
                    completed = true;
                    if (timeout) {
                        clearTimeout(timeout);
                    }
                    resolve();
                    return true;
                }
                return false;
            }

            const fail = (reason?: any) => {
                if (tryComplete()) {
                    console.log(" - FAIL " + suite.name + "." + unit.name +
                        (reason ? (": " + reason) : "")
                    );
                    failCount += 1;
                }
            };
            const pass = (reason?: any) => {
                if (tryComplete()) {
                    if (this.verbose) {
                        console.log(" - PASS " + suite.name + "." + unit.name +
                            (reason ? (": " + reason) : "")
                        );
                    }
                    passCount += 1;
                }
            };
            const skip = (reason?: any) => {
                if (tryComplete()) {
                    console.log(" - SKIP " + suite.name + "." + unit.name +
                        (reason ? (": " + reason) : "")
                    );
                    skipCount += 1;
                }
            };

            if (unit.timeoutInMs) {
                timeout = setTimeout(() =>
                    fail("Timed out after " +
                        unit.timeoutInMs + " ms."),
                    unit.timeoutInMs
                );
            }
            try {
                unit.test({ fail, pass, skip }, ...extras);
                if (!unit.timeoutInMs) {
                    pass(unit);
                }
            } catch (error) {
                fail(error);
            }
        });

        const executeSuite = (suite: Suite) => new Promise(resolve => {
            if (this.verbose) {
                console.log("> " + suite.name);
            }

            let before: Promise<any[]>;
            if (suite.before) {
                let extras = suite.before();
                before = (extras instanceof Promise)
                    ? extras
                    : Promise.resolve(extras);
            } else {
                before = Promise.resolve([]);
            }

            before.then(extras => Promise
                .all(suite.units.map(unit => executeUnit(suite, unit, extras)))
                .then(() => {
                    if (this.verbose) {
                        console.log();
                    }
                    if (suite.after) {
                        let promise = suite.after(...extras);
                        if (promise instanceof Promise) {
                            promise.then(() => resolve());
                            return;
                        }
                    }
                    resolve();
                }));
        });

        const suites = this.suites
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name));

        return Promise
            .all(suites.map(suite => executeSuite(suite)))
            .then(() => new Promise<number>(resolve => {
                if (failCount > 0 || skipCount > 0 || this.verbose) {
                    console.log("> Test Results");
                    console.log(" - Failed units:  " + failCount);
                    console.log(" - Passed units:  " + passCount);
                    console.log(" - Skipped units: " + skipCount);
                }
                resolve(failCount === 0 ? 0 : 1);
            }));
    }
}

export interface ConsoleTesterOptions {
    /**
     * Whether or not console output is to include additional details.
     */
    verbose?: boolean,
}