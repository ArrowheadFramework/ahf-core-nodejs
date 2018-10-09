import * as dns from "./dns";
import * as unit from "./unit";

unit.runSuitesAndExit(
    dns.suiteMessage,
    dns.suiteResourceData,
    dns.suiteResourceRecord,
);