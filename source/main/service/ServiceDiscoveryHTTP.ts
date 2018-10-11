import {ServiceDiscovery} from ".";
import {ServiceQueryForm, ServiceQueryResult, ServiceRegistryEntry} from "../data";
import * as http from "./http";

/**
 * A `ServiceDiscovery` client using HTTP or HTTPS for sending and receiving
 * messages.
 */
export class ServiceDiscoveryHTTP implements ServiceDiscovery {
    private readonly client: http.Client;
    private readonly service: ServiceRegistryEntry;

    /**
     * Creates new HTTP(S) service discovery service client.
     *
     * @param serviceDiscoveryEntry Description of service to connect to.
     */
    public constructor(serviceDiscoveryEntry: ServiceRegistryEntry) {
        this.client = http.Client.create();
        this.service = serviceDiscoveryEntry; // TODO: Get URL schema, domain, etc.
    }

    async query(query: ServiceQueryForm): Promise<ServiceQueryResult> {
        throw new Error("Not implemented");
    }

    async register(entry: ServiceRegistryEntry): Promise<void> {
        throw new Error("Not implemented");
    }

    async unregister(entry: ServiceRegistryEntry): Promise<void> {
        throw new Error("Not implemented");
    }


}