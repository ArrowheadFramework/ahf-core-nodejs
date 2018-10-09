import * as dgram from "dgram";
import * as events from "events";
import {Writer} from "./io";
import {Message} from "./Message";
import * as net from "net";
import {ResolverError, ResolverErrorKind} from "./Resolver";

const BYTE_LENGTH_MAX_UDP = 512;
const BYTE_LENGTH_MAX_TCP = 65535;

/**
 * A DNS resolver socket.
 *
 * Maintains a UDP socket transport and a TCP socket transport, each associated
 * with a queue of outbound DNS requests and a set of inbound DNS responses.
 * Provided requests are transmitted via a transport selected by request byte
 * size or DNS OPCODE. Truncated or lost UDP messages are automatically retried
 * a limited amount of times.
 */
export class ResolverSocket {
    public readonly options: ResolverSocketOptions;

    private readonly workerTCP: Worker;
    private readonly workerUDP: Worker;

    /**
     * Creates new DNS resolver socket.
     *
     * @param options IP address of DNS server, or socket options object.
     */
    public constructor(options: string | ResolverSocketOptions) {
        if (typeof options === "string") {
            options = {address: options};
        }
        if (net.isIP(options.address) === 0) {
            throw new Error("Not an IP address: " + options.address);
        }

        this.options = {
            address: options.address,
            keepOpenForMs: options.keepOpenForMs || 3000,
            onErrorIgnored: options.onErrorIgnored || (error => {
                console.debug("Ignored by Resolver Socket: " + error);
            }),
            port: options.port || 53,
            timeoutInMs: options.timeoutInMs || 10000,
        };

        this.workerTCP = new Worker(
            new TransportTCP(this.options),
            this.options
        );
        this.workerUDP = new Worker(
            new TransportUDP(this.options),
            this.options
        );
    }

    /**
     * Attempts to send DNS message to DNS server.
     *
     * @param request Message to send.
     */
    public send(request: Message): Promise<Message> {
        if (request.byteLength <= BYTE_LENGTH_MAX_UDP) {
            return this.sendViaUDP(request);

        } else if (request.byteLength <= BYTE_LENGTH_MAX_TCP) {
            return this.sendViaTCP(request);
        }
        return Promise.reject(new ResolverError(
            ResolverErrorKind.RequestTooLong,
            request
        ));
    }

    private sendViaUDP(request: Message): Promise<Message> {
        return new Promise((resolve, reject) => {
            const task = new Task(request, response => {
                if (response.flags.tc) {
                    this.workerTCP.assign(new Task(request, resolve, reject));
                } else {
                    resolve(response);
                }
            }, reject);
            task.retriesLeft = 2;
            this.workerUDP.assign(task);
        });
    }

    private sendViaTCP(request: Message): Promise<Message> {
        return new Promise((resolve, reject) => {
            this.workerTCP.assign(new Task(request, resolve, reject));
        });
    }

    /**
     * Closes socket.
     */
    public close() {
        this.workerTCP.dismiss();
        this.workerUDP.dismiss();
    }
}

/**
 * `ResolverSocket` options.
 */
export interface ResolverSocketOptions {
    /**
     * IPv4 or IPv6 address, excluding port, of remote host.
     */
    readonly address: string;

    /**
     * Time to keep socket open after successfully sending and receiving, in
     * milliseconds.
     *
     * Defaults to 3000 (3 seconds).
     */
    readonly keepOpenForMs?: number;

    /**
     * Function called whenever an error occurs that cannot be meaningfully
     * handled by the socket.
     */
    readonly onErrorIgnored?: (error: any) => void;

    /**
     * DNS server port number.
     *
     * Defaults to 53.
     */
    readonly port?: number;

    /**
     * Socket timeout, in milliseconds.
     *
     * If a period of inactivity while sending or receiving data via the socket
     * exceeds the given timeout, any outstanding messages are rejected with
     * a timeout error.
     *
     * Defaults to 10000 (10 seconds).
     */
    readonly timeoutInMs?: number;
}

class Task {
    public constructor(
        public readonly request: Message,
        public readonly resolve: (response: Message) => void,
        public readonly reject: (error: ResolverError) => void,
        public retriesLeft: number = 0,
    ) {
    }

    public timeSentUnixMs?: number;
}

class Worker {
    private closer: NodeJS.Timer;
    private enqueued: Array<Task>;
    private expected: Map<number, Task>;

    public constructor(
        private readonly transport: Transport,
        private readonly options: ResolverSocketOptions,
    ) {
        this.enqueued = [];
        this.expected = new Map();

        const rejectAll = (reason: any) => {
            let wrap: (task: Task) => ResolverError;
            if (reason instanceof ResolverError) {
                wrap = task => new ResolverError(
                    reason.kind,
                    reason.request || task.request,
                    reason.response,
                    reason.reason
                );
            } else {
                wrap = task => new ResolverError(
                    ResolverErrorKind.Other,
                    task.request,
                    undefined,
                    reason
                );
            }
            const reject = (task: Task) => task.reject(wrap(task));
            for (let task of this.enqueued) {
                reject(task);
            }
            for (let task of this.expected.values()) {
                reject(task);
            }
        };

        transport.on("close", () => this.poll());
        transport.on("error", rejectAll);
        transport.on("open", () => this.poll());
        transport.on("response", response => {
            const task = this.expected.get(response.id);
            if (task) {
                this.expected.delete(response.id);
                task.resolve(response)
            } else {
                this.options.onErrorIgnored(new ResolverError(
                    ResolverErrorKind.ResponseIDUnexpected,
                    undefined,
                    response
                ));
            }
        });
        transport.on("timeout", () => rejectAll(new ResolverError(
            ResolverErrorKind.RequestUnanswered
        )));

        setInterval(() => {
            if (this.expected.size === 0) {
                return;
            }
            const threshold = new Date().getTime() - this.options.timeoutInMs;
            for (const [id, task] of this.expected) {
                if (threshold >= task.timeSentUnixMs) {
                    this.expected.delete(id);
                    if (task.retriesLeft-- > 0) {
                        this.assign(task);
                    } else {
                        task.reject(new ResolverError(
                            ResolverErrorKind.RequestUnanswered,
                            task.request
                        ));
                    }
                }
            }
        }, Math.max(options.timeoutInMs / 20, 50)).unref();
    }

    public assign(task: Task) {
        if (this.isAssigned(task.request.id)) {
            task.reject(new ResolverError(
                ResolverErrorKind.RequestIDInUse,
                task.request
            ));
        } else {
            this.enqueued.push(task);
            this.poll();
        }
    }

    private poll() {
        if (this.enqueued.length === 0) {
            return;
        }
        if (!this.transport.opened()) {
            this.transport.open();
            return;
        }

        this.enqueued.forEach(task => {
            task.timeSentUnixMs = new Date().getTime();
            this.expected.set(task.request.id, task);
            this.transport.send(task.request);
        });
        this.enqueued = [];

        this.deferCloseIfEmpty();
    }

    private deferCloseIfEmpty() {
        if (this.closer !== undefined) {
            clearTimeout(this.closer);
        }
        this.closer = setTimeout(() => {
            if (!this.closeIfEmpty()) {
                this.deferCloseIfEmpty();
            }
        }, this.options.keepOpenForMs);
    }

    private closeIfEmpty(): boolean {
        if (this.expected.size === 0 && this.enqueued.length === 0) {
            if (this.transport) {
                this.transport.close();
            }
            return true;
        }
        return false;
    }

    public isAssigned(id: number): boolean {
        for (let i = 0; i < this.enqueued.length; ++i) {
            const task = this.enqueued[i];
            if (task.request.id === id) {
                return true;
            }
        }
        return this.expected.has(id);
    }

    public dismiss() {
        this.transport.close();
    }
}

interface Transport extends events.EventEmitter {
    close();
    open();
    opened(): boolean;
    send(request: Message);
    on(event: "close", r: () => void): this;
    on(event: "error", r: (error: any) => void): this;
    on(event: "response", r: (response: Message) => void): this;
    on(event: "open", r: () => void): this;
    on(event: "timeout", r: () => void): this;
}

class TransportTCP extends events.EventEmitter implements Transport {
    private isOpen: boolean;
    private isTimedOut: boolean;
    private socket: net.Socket;

    public constructor(private readonly options: ResolverSocketOptions) {
        super();
        this.isOpen = false;
        this.isTimedOut = false;
    }

    close() {
        if (this.isOpen) {
            this.isOpen = false;
            this.socket.end();
        }
    }

    open() {
        if (this.isOpen) {
            return;
        }
        this.socket = new net.Socket();
        this.socket.setTimeout(this.options.timeoutInMs);

        this.socket.on("close", () => {
            this.isOpen = false;
            if (this.isTimedOut) {
                this.isTimedOut = false;
                this.emit("timeout");
            } else {
                this.emit("close");
            }
        });
        this.socket.on("connect", () => {
            this.isOpen = true;
            this.emit("open");
        });
        this.socket.on("error", error => this.emit("error", error));
        this.socket.on("timeout", () => {
            this.isTimedOut = true;
            this.socket.end();
        });

        let receiveBuffer: Buffer = Buffer.alloc(2);
        let bytesExpected: number = undefined;
        let bytesReceived: number = 0;

        let onLengthData: (chunk: Buffer) => void;
        let onMessageData: (chunk: Buffer) => void;

        onLengthData = (chunk: Buffer) => {
            let offset;
            if (bytesReceived === 0 && chunk.length >= 2) {
                receiveBuffer = chunk;
                bytesReceived = offset = 2;
            } else {
                offset = chunk.copy(receiveBuffer, 0, 0, 2 - bytesReceived);
                bytesReceived += offset;
            }
            if (bytesReceived === 2) {
                bytesExpected = receiveBuffer.readUInt16BE(0);

                chunk = chunk.slice(offset);
                if (chunk.length >= bytesExpected) {
                    receiveBuffer = chunk.slice(0, bytesExpected);
                    bytesReceived = bytesExpected;
                    chunk = chunk.slice(bytesExpected);
                } else {
                    receiveBuffer = Buffer.alloc(bytesExpected);
                    bytesReceived = 0;
                }
                this.socket.removeListener("data", onLengthData);
                this.socket.addListener("data", onMessageData);
                onMessageData(chunk);
            }
        };
        onMessageData = (chunk: Buffer) => {
            const bytesRemaining = bytesExpected - bytesReceived;
            if (bytesRemaining > 0) {
                bytesReceived += chunk.copy(receiveBuffer, bytesRemaining);
                chunk = chunk.slice(bytesRemaining);
            }
            if (bytesRemaining <= 0) {
                bytesExpected = undefined;
                bytesReceived = 0;
                try {
                    const response = Message.read(receiveBuffer);
                    this.emit("response", response);
                } catch (error) {
                    this.socket.emit("error", error);
                    this.socket.destroy();
                    return;
                }
                this.socket.removeListener("data", onMessageData);
                this.socket.addListener("data", onLengthData);
                if (chunk.length > 0) {
                    onLengthData(chunk);
                }
            }
        };
        this.socket.addListener("data", onLengthData);
        this.socket.connect(this.options.port, this.options.address);
    }

    opened(): boolean {
        return this.isOpen;
    }

    send(request: Message) {
        const buffer = Buffer.alloc(request.byteLength + 2);
        request.write(new Writer(buffer.slice(2)));

        // Write full message length at offset 0. See RFC 1035 section 4.2.2.
        buffer.writeUInt16BE(request.byteLength, 0);

        this.socket.write(buffer);
    }
}

class TransportUDP extends events.EventEmitter implements Transport {
    private error?: any;
    private isOpen: boolean;
    private socket: dgram.Socket;

    public constructor(
        private readonly options: ResolverSocketOptions,
    ) {
        super();
        this.isOpen = false;
    }

    close() {
        if (this.isOpen) {
            this.isOpen = false;
            this.socket.close();
        }
    }

    open() {
        if (this.isOpen) {
            return;
        }
        if (net.isIPv4(this.options.address)) {
            this.socket = dgram.createSocket("udp4");
        } else {
            this.socket = dgram.createSocket("udp6");
        }
        this.socket.on("close", () => {
            this.isOpen = false;
            if (this.error) {
                const error = this.error;
                this.error = undefined;
                this.emit("error", error);
            } else {
                this.emit("close");
            }
        });
        const onError = error => {
            this.error = error;
            this.socket.close();
        };
        this.socket.on("error", onError);
        this.socket.on("listening", () => {
            this.isOpen = true;
            this.emit("open");
        });
        this.socket.on("message", (responseBuffer, info) => {
            try {
                const response = Message.read(responseBuffer);
                this.emit("response", response);
            } catch (error) {
                onError(error);
            }
        });
        this.socket.bind();
    }

    opened(): boolean {
        return this.isOpen;
    }

    send(request: Message) {
        this.socket.send(
            request.write(),
            this.options.port,
            this.options.address
        );
    }
}
