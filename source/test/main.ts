import * as dns from "./dns";
import * as unit from "./unit";

unit.runSuites(
    dns.suiteMessage,
    dns.suiteResourceData,
    dns.suiteResourceRecord,
).then(report => process.exit(report.failed === 0 ? 0 : 1));