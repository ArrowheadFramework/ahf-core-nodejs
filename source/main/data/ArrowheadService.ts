/**
 * Details about some Arrowhead service, served via HTTP or HTTPS.
 *
 * Even though other application-layer protocols, such as CoAP, are to be
 * supported, there is currently no known way of specifying that any other
 * protocol than HTTP or HTTPS is supported.
 */
export interface ArrowheadService {
    /**
     * Identifies general kind of service.
     */
    serviceDefinition?: string;

    /**
     * Array of encodings supported by service, such as "XML", "JSON", etc.
     */
    interfaces?: string[];

    /**
     * Any additional information about service.
     */
    serviceMetadata?: {
        /**
         * If given, use a secure connection established either via token
         * passing or X.509 certificates.
         */
        security?: "certificate" | "token",

        /**
         * Any other properties.
         */
        [other: string]: string;
    };
}

export namespace ArrowheadService {
    /**
     * Whether or not given `service` requires the use of secure communication.
     *
     * @param service DArrowhead service.
     * @return Whether or not `service` is secure.
     */
    export function isSecure(service: ArrowheadService): boolean {
        return service.serviceMetadata !== undefined
            && service.serviceMetadata.security !== undefined;
    }
}