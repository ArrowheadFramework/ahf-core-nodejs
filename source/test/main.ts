import * as dns from "./dns";
import * as unit from "./unit";

new unit.ConsoleTester({ verbose: false })
    .register(dns.TestMessage)
    .register(dns.TestResourceData)
    .register(dns.TestResourceRecord)
    .run()
    .then(status => process.exit(status));