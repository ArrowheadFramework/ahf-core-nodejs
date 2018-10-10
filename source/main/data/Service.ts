/**
 * Details about some Arrowhead service.
 */
export interface Service {
    /**
     * Identifies general kind of service.
     */
    name: string;

    /**
     * Transport protocol used to contact service.
     */
    transport: ServiceTransport;

    /**
     * Port number through which service is available.
     */
    port: number;

    /**
     * Application protocol used to contact service.
     *
     * Examples could be "http", "https", "grpc", etc.
     */
    protocol: string;

    /**
     * Message payload encodings supported by service.
     *
     * Examples could be "json", "cbor", "protobuf", etc.
     */
    encodings: Set<string>;

    /**
     * Service version identifier.
     */
    version: number;

    /**
     * Any additional information about service.
     */
    metadata: {
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
 * The transport protocols through which Arrowhead services may be available.
 */
export enum ServiceTransport {
    TCP,
    UDP,
}