/**
 * An HTTP(S) request.
 */
export interface Request {
    /**
     * Request method.
     */
    method: "DELETE" | "GET" | "HEAD" | "OPTIONS" | "POST" | "PUT";

    /**
     * Request URL.
     */
    url: string;

    /**
     * Request headers.
     *
     * Default headers may be added to the request apart from any given here.
     */
    headers?: { [name: string]: string },

    /**
     * Request timeout, in seconds.
     */
    timeout?: number;

    /**
     * Request body, if supported by used `method`.
     */
    body?: string
}