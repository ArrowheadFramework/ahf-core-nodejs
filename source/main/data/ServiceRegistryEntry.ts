import {ArrowheadService} from "./ArrowheadService";
import {ArrowheadSystem} from "./ArrowheadSystem";

/**
 * Description of how a particular Arrowhead service can be accessed via a
 * particular Arrowhead system.
 */
export interface ServiceRegistryEntry {
    /**
     * Service provided by a provider system.
     */
    providedService: ArrowheadService;

    /**
     * System providing entry service.
     */
    provider: ArrowheadSystem;

    /**
     * Base URL if service uses HTTP, HTTPS, CoAP, or similar; or message topic
     * if service uses MQTT.
     */
    serviceURI?: string;

    /**
     * Service version.
     *
     * Version is assumed to be 1 if not present in a given object.
     */
    version?: number;

    /**
     * Whether or not UDP is to be used rather than TCP for communicating with
     * service.
     */
    udp?: boolean;

    /**
     * Time remaining, in seconds, until this service registry entry expires.
     */
    ttl?: number;
}