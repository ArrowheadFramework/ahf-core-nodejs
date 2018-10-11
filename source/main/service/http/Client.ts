import {Request, Response} from ".";
import {ClientBrowser} from "./ClientBrowser";
import {ClientNode} from "./ClientNode";

/**
 * An HTTP client.
 */
export interface Client {
    /**
     * Sends given HTTP(S) request.
     *
     * The returned promise is not rejected if the returned response describes
     * an error.
     *
     * @param request HTTP(S) request to send.
     * @return Promise of an eventual response.
     */
    send(request: Request): Promise<Response>;
}

export namespace Client {
    /**
     * Creates new HTTP(S) client instance.
     */
    export function create(): Client {
        if (ClientBrowser.isSupported()) {
            return new ClientBrowser();
        }
        if (ClientNode.isSupported()) {
            return new ClientNode();
        }
        throw new Error("No supported HTTP(S) client available");
    }
}