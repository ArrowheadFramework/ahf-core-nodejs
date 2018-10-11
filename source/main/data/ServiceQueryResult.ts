import {ServiceRegistryEntry} from "./ServiceRegistryEntry";

/**
 * The result of processing some `ServiceQueryForm`.
 */
export interface ServiceQueryResult {
    /**
     * Matching service registry entries.
     */
    serviceQueryData: ServiceRegistryEntry[];
}