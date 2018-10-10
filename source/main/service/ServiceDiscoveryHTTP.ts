import * as http from "http";
import * as https from "https";
import {
    ServiceDiscovery,
    ServiceQuery,
    ServiceQueryResults,
    ServiceRecord
} from "./ServiceDiscovery";

/**
 * A `ServiceDiscovery` client using HTTP or HTTPS for sending and receiving
 * messages.
 */
export class ServiceDiscoveryHTTP implements ServiceDiscovery {
    private readonly agent: http.Agent | https.Agent;

    /**
     * Creates new HTTP(S) service discovery service client from given record.
     *
     * @param record Description of service to connect to.
     */
    public constructor(record: ServiceRecord) {
        if (record.service.name != "ServiceDiscovery") {
            throw new Error("Unsupported service kind: "
                + record.service.name);
        }
        if (!record.service.encodings.has("json")) {
            throw new Error("No compatible service encoding in: {"
                + record.service.encodings + "}");
        }
        switch (record.service.protocol) {
            case "http":
                this.agent = new http.Agent();
                break;

            case "https":
                this.agent = new https.Agent();
                break;

            default:
                throw new Error("Unsupported service protocol: "
                    + record.service.protocol);
        }
    }

    public async query(query?: ServiceQuery): Promise<ServiceQueryResults> {
        return undefined;
    }

    public async register(record: ServiceRecord): Promise<void> {
        return undefined;
    }

    public async unregister(record: ServiceRecord): Promise<void> {
        return undefined;
    }

}