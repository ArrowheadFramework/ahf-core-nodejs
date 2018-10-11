import {Client, Request, Response} from ".";

/**
 * HTTP(S) client for Web browsers.
 */
export class ClientBrowser implements Client {
    /**
     * @return Whether this HTTP(S) client is supported on the current platform.
     */
    public static isSupported(): boolean {
        return XMLHttpRequest !== undefined;
    }

    public send(request: Request): Promise<Response> {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open(request.method, request.url, true);
            if (typeof request.headers === "object") {
                for (const name of Object.keys(request.headers)) {
                    xhr.setRequestHeader(name, request.headers[name]);
                }
            }
            xhr.timeout = (request.timeout || 10) * 1000;
            xhr.addEventListener("abort", () => {
                reject(new Error(`${request.method} ${request.url} aborted`));
            });
            xhr.addEventListener("done", () => {
                resolve({
                    code: xhr.status,
                    reason: xhr.statusText,
                    headers: xhr.getAllResponseHeaders()
                        .split("\r\n")
                        .reduce((headers, header) => {
                            const [name, value] = header.split(":", 2);
                            if (name !== undefined && value !== undefined) {
                                headers[name.trim().toLowerCase()] = value.trim();
                            }
                            return headers;
                        }, {}),
                    request: request,
                    body: xhr.responseText,
                });
            });
            xhr.addEventListener("error", () => {
                reject(new Error(`${request.method} ${request.url} failed`));
            });
            xhr.addEventListener("timeout", () => {
                reject(new Error(`${request.method} ${request.url} timed out`));
            });
            xhr.send(request.body);
        });
    }
}