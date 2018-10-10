/**
 * Details about some Arrowhead system.
 */
export interface System {
    /**
     * Name uniquely identifying a particular system.
     */
    name: string;

    /**
     * Internet protocol supported by system.
     */
    internet: SystemInternet;

    /**
     * IP address through which system is available.
     */
    address: string;
}

/**
 * The internet protocols through which Arrowhead systems may be available.
 */
export enum SystemInternet {
    IPv4,
    IPv6,
}