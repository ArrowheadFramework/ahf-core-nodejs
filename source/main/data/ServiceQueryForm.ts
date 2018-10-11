import {ArrowheadService} from "./ArrowheadService";

/**
 * Describes one or more desired services.
 */
export interface ServiceQueryForm {
    /**
     * Details about services looked for.
     */
    service: ArrowheadService;

    /**
     * Whether systems matching `service` are to be pinged.
     */
    pingProviders?: boolean;

    /**
     * Whether or not the `serviceMetadata` field of `serice` is to be considered.
     */
    metadataSearch?: boolean;

    /**
     * Minimum version of desired service.
     */
    version?: number;
}





