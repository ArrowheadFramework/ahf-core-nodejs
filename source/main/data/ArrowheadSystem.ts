/**
 * Details about some Arrowhead system.
 *
 * An Arrowhead system is a physical or virtual machine that hosts one or more
 * Arrowhead services.
 */
export interface ArrowheadSystem {
    /**
     * Name uniquely identifying a particular system.
     */
    systemName?: string;

    /**
     * IPv4 address through which system is available.
     */
    address?: string;

    /**
     * Port through which the system exposes its services.
     */
    port?: number;

    /**
     * Data required to authenticate with system.
     */
    authenticationInfo?: string;
}