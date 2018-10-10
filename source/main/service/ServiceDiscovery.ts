import {Service, ServiceTransport, System} from "../data";
import {Query, QueryResults} from "./Query";

/**
 * A service useful for registering, unregistering and discovering services.
 */
export interface ServiceDiscovery {
    /**
     * Requests `ServiceRecord`s matching given `query`.
     *
     * If no `query` is provided, the service will provide some or all of its
     * service records.
     *
     * @param query Description of what service records to get.
     * @return Query results.
     */
    query(query?: ServiceQuery): Promise<ServiceQueryResults>;

    /**
     * Registers service, as described by given `record`.
     *
     * @param record Service to register.
     */
    register(record: ServiceRecord): Promise<void>;

    /**
     * Unregisters service, described by given `record`.
     *
     * In particular, one existing record with a service name, transport, port,
     * version and system name matching `record` is removed.
     *
     * @param record Service to unregister.
     */
    unregister(record: ServiceRecord): Promise<void>;
}

/**
 * An Arrowhead service record.
 */
export interface ServiceRecord {
    /**
     * Provided service.
     */
    service: Service;

    /**
     * Description of system providing service.
     */
    provider: System;

    /**
     * Remaining lifespan of record, in seconds.
     */
    lifespan: number;
}

/**
 * A query for Arrowhead service records.
 *
 * Objects matching this are treated as filters, where each set property must
 * match existing records exactly, while unset properties are ignored. If a set
 * property is a collection, existing records containing all collection
 * elements are treated as matches.
 */
export interface ServiceQuery extends Query {
    /**
     * Identifies the general kind of service.
     */
    name?: string;

    /**
     * Transport protocol used to contact service.
     */
    transport?: ServiceTransport;

    /**
     * Application protocol used to contact service.
     */
    protocol?: string;

    /**
     * Message payload encodings supported by service.
     */
    encodings?: Set<string>;

    /**
     * Service version identifier.
     */
    version?: number;

    /**
     * Any additional information about service.
     */
    metadata?: {
        /**
         * Path to be appended to any HTTP calls made to service.
         */
        path?: string;

        /**
         * Any other properties.
         */
        [other: string]: string;
    };
}

/**
 * The results of handling some `ServiceQuery`.
 */
export interface ServiceQueryResults extends Query, QueryResults<ServiceRecord> {}