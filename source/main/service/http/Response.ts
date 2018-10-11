import {Request} from ".";

/**
 * An HTTP(S) response.
 */
export interface Response {
    /**
     * Response code.
     */
    code: number;

    /**
     * Response code reason text.
     */
    reason: string;

    /**
     * Response headers, if any.
     */
    headers?: { [name: string]: string },

    /**
     * Request responded to.
     */
    request: Request;

    /**
     * Response body, if any.
     */
    body?: string;
}