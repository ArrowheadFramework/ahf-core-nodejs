import {Client, Request, Response} from ".";

/**
 * HTTP(S) client for Node.js.
 */
export class ClientNode implements Client {
    /**
     * @return Whether this HTTP(S) client is supported on the current platform.
     */
    public static isSupported(): boolean {
        return false;
    }

    send(request: Request): Promise<Response> {
        throw new Error("Not implemented");
    }
}