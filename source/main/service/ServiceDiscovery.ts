import {ServiceQueryForm, ServiceQueryResult, ServiceRegistryEntry} from "../data";

/**
 * A service useful for registering, unregistering and discovering services.
 */
export interface ServiceDiscovery {
    /**
     * Requests `ServiceRegistryEntry` objects matching given `query`.
     *
     * @param query Description of what service entries to get.
     * @return Query results.
     */
    query(query: ServiceQueryForm): Promise<ServiceQueryResult>;

    /**
     * Registers service, as described by given `entry`.
     *
     * @param entry ArrowheadService to register.
     */
    register(entry: ServiceRegistryEntry): Promise<void>;

    /**
     * Unregisters service described by given `entry`.
     *
     * In particular, one existing entry with a `serviceDefinition` and a
     * `systemName` matching `entry` will be removed.
     *
     * @param entry ArrowheadService to unregister.
     */
    unregister(entry: ServiceRegistryEntry): Promise<void>;
}