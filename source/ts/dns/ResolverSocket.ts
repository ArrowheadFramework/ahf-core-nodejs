import { OpCode, RCode } from "./constants";
import * as dgram from "dgram";
import { Reader, Writer } from "./io";
import { Message } from "./Message";
import * as net from "net";
import { ResolverError, ResolverErrorKind } from "./Resolver";

/**
 * A DNS resolver socket.
 *
 * Maintains a UDP socket and a TCP socket, each with a queue of outbound DNS
 * requests and a set of inbound DNS responses. Provided requests are
 * transmitted via a transport selected by request byte size. Truncated or lost
 * UDP messages are automatically retried.
 */
export class ResolverSocket {
    public readonly options: ResolverSocketOptions;

    private readonly socketTCP: ResolverSocketTCP;
    private readonly socketUDP: ResolverSocketUDP;

    private readonly timeoutTimer: NodeJS.Timer;

    /**
     * Creates new DNS resolver socket.
     *
     * @param options IP address of DNS server, or socket options object.
     */
    public constructor(options: string | ResolverSocketOptions) {
        if (typeof options === "string") {
            options = { address: options };
        }
        if (net.isIP(options.address) === 0) {
            throw new Error("Not an IP address: " + options.address);
        }
        this.options = {
            address: options.address,
            buffer: options.buffer || Buffer.alloc(65537),
            keepOpenForMs: options.keepOpenForMs || 3000,
            port: options.port || 53,
            timeoutInMs: options.timeoutInMs || 10000,
            onIgnoredError: options.onIgnoredError || (error => {
                console.debug("Unhandled resolver socket error: %s\n", error);
            }),
        };

        const onError = (error: Error) => {
            const kind = error instanceof ResolverError
                ? error.kind
                : ResolverErrorKind.Other;
            this.socketTCP.rejectAllTasksWith(kind, error);
            this.socketUDP.rejectAllTasksWith(kind, error);
        };
        const onRequestTooLarge = (task: ResolverSocketTask) => {
            task.retriesLeft = 0;
            this.socketTCP.enqueue(task);
        };
        const onTimeout = () => {
            this.socketTCP.rejectAllTasksWith(
                ResolverErrorKind.RequestUnanswered
            );
        };
        this.socketTCP = new ResolverSocketTCP(
            onError,
            onTimeout,
            this.options
        );
        this.socketUDP = new ResolverSocketUDP(
            onError,
            onRequestTooLarge,
            this.options
        );

        this.timeoutTimer = setInterval(() => {
            const timestamp = new Date().getTime() - this.options.timeoutInMs;
            this.socketTCP.retryOrTimeoutInboundsOlderThan(timestamp);
            this.socketUDP.retryOrTimeoutInboundsOlderThan(timestamp);
        }, this.options.timeoutInMs / 20);
        this.timeoutTimer.unref();
    }

    /**
     * Attempts to send DNS message to DNS server.
     *
     * @param request Message to send.
     */
    public send(request: Message): Promise<Message> {
        return new Promise((resolve, reject) => {
            const task = new ResolverSocketTask(request, resolve, reject);
            if (request.flags.opcode !== OpCode.UPDATE) {
                task.retriesLeft = 2;
                this.socketUDP.enqueue(task);
            } else {
                this.socketTCP.enqueue(task);
            }
        });
    }

    /**
     * Closes socket.
     */
    public close() {
        clearInterval(this.timeoutTimer);
        this.socketTCP.close();
        this.socketUDP.close();
    }
}

abstract class ResolverSocketTransport<T> {
    protected readonly onUnrecoverableError: (error: Error) => void;
    protected readonly options: ResolverSocketOptions;

    private closer: NodeJS.Timer;
    private opened: boolean;
    private inbound: Map<number, ResolverSocketTask>;
    private outbound: Array<ResolverSocketTask>;
    private socket: T;

    protected constructor(
        onUnrecoverableError: (error: Error) => void,
        options: ResolverSocketOptions
    ) {
        this.onUnrecoverableError = (error) => {
            this.onClosed(false);
            this.rejectAllTasksWith(error instanceof ResolverError
                ? error.kind
                : ResolverErrorKind.Other, error);
            onUnrecoverableError(error);
        };
        this.options = options;

        this.opened = false;
        this.inbound = new Map();
        this.outbound = [];
    }

    public rejectAllTasksWith(kind: ResolverErrorKind, cause?: Error) {
        const reject = (task: ResolverSocketTask) => {
            task.reject(new ResolverError(
                kind,
                task.request,
                undefined,
                cause
            ));
            this.inbound.delete(task.request.id);
        }
        for (const task of this.inbound.values()) {
            reject(task);
        }
        for (const task of this.outbound) {
            reject(task);
        }
    }

    protected onClosed(reopen: boolean) {
        this.opened = false;
        this.socket = undefined;
        if (reopen) {
            for (const [id, task] of this.inbound.entries()) {
                this.outbound.push(task);
            }
            this.inbound.clear();
            if (this.outbound.length > 0) {
                this.poll();
            }
        }
    }

    protected onOpened() {
        this.opened = true;
        this.poll();
    }

    protected onMessageReceived(response: Message) {
        const task = this.inbound.get(response.id);
        if (task) {
            this.inbound.delete(response.id);
            task.resolve(response);
        } else {
            this.options.onIgnoredError(new ResolverError(
                ResolverErrorKind.ResponseIDUnexpected,
                undefined,
                response
            ));
        }
    }

    public enqueue(task: ResolverSocketTask) {
        if (this.inbound.has(task.request.id)) {
            task.reject(new ResolverError(
                ResolverErrorKind.RequestIDInUse,
                task.request
            ));
        } else {
            this.outbound.push(task);
            this.poll();
        }
    }

    protected poll() {
        if (this.outbound.length === 0) {
            return;
        }
        if (!this.socket) {
            this.socket = this.openSocket();
            return;
        }
        if (!this.opened) {
            return;
        }
        this.outbound.forEach(task => {
            this.send(this.socket, task);
            task.timestampSent = new Date().getTime();
            this.inbound.set(task.request.id, task);
        });
        this.outbound = [];

        this.deferCloseIfNoInboundsOrOutbounds();
    }

    /**
     * Opens socket transport and registers relevant socket event handlers.
     *
     * This function MUST return a socket object with event handlers registered
     * that WILL call `this.onOpened()`, `this.onClosed()` and
     * `this.onMessageReceived()` when appropriate.
     */
    protected abstract openSocket(): T;

    protected abstract send(socket: T, task: ResolverSocketTask);

    private deferCloseIfNoInboundsOrOutbounds() {
        if (this.closer !== undefined) {
            clearTimeout(this.closer);
        }
        this.closer = setTimeout(() => {
            if (!this.closeIfNoInboundsOrOutbounds()) {
                this.deferCloseIfNoInboundsOrOutbounds();
            }
        }, this.options.keepOpenForMs);
    }

    private closeIfNoInboundsOrOutbounds(): boolean {
        if (this.inbound.size === 0 && this.outbound.length === 0) {
            if (this.socket) {
                this.close();
            }
            return true;
        }
        return false;
    }

    public close() {
        this.closeSocket(this.socket);
    }

    protected abstract closeSocket(socket: T);

    public retryOrTimeoutInboundsOlderThan(timestamp: number) {
        if (this.inbound.size === 0) {
            return;
        }
        for (const [id, task] of this.inbound) {
            if (timestamp >= task.timestampSent) {
                this.inbound.delete(id);
                if (task.retriesLeft-- > 0) {
                    this.enqueue(task);
                } else {
                    task.reject(new ResolverError(
                        ResolverErrorKind.RequestUnanswered,
                        task.request
                    ));
                }
            }
        }
    }

    protected forget(task: ResolverSocketTask) {
        this.inbound.delete(task.request.id);
    }
}

class ResolverSocketTCP extends ResolverSocketTransport<net.Socket> {
    private readonly onTimeout: () => void;

    public constructor(
        onError: (error: Error) => void,
        onTimeout: () => void,
        options: ResolverSocketOptions
    ) {
        super(onError, options);

        this.onTimeout = onTimeout;
    }

    protected openSocket(): net.Socket {
        const socket = new net.Socket();
        socket.setTimeout(this.options.timeoutInMs);

        socket.on("close", hadError => this.onClosed(!hadError));
        socket.on("connect", () => this.onOpened());
        socket.on("error", error => this.onUnrecoverableError(error));
        socket.on("timeout", () => {
            socket.end();
            this.onTimeout();
        });

        let receiveBuffer: Buffer = this.options.buffer;
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
                    receiveBuffer = this.options.buffer;
                    bytesReceived = 0;
                }
                socket.removeListener("data", onLengthData);
                socket.addListener("data", onMessageData);
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
                    this.onMessageReceived(response);
                } catch (error) {
                    socket.emit("error", error);
                    socket.destroy();
                    return;
                }
                socket.removeListener("data", onMessageData);
                socket.addListener("data", onLengthData);
                if (chunk.length > 0) {
                    onLengthData(chunk);
                }
            }
        };
        socket.addListener("data", onLengthData);

        socket.connect(this.options.port, this.options.address);
        return socket;
    }

    protected send(socket: net.Socket, task: ResolverSocketTask) {
        const buffer = this.options.buffer;
        const writer = new Writer(buffer, 2);

        task.request.write(writer);
        if (task.request.transactionSigner) {
            task.request.transactionSigner
                .sign(task.request.id, buffer.slice(2, writer.offset()))
                .write(writer);

            // Increment ARCOUNT. See RFC 2845 section 3.4.1.
            buffer.writeUInt16BE(task.request.additionals.length + 1, 10 + 2);
        }

        if (writer.overflowed) {
            task.reject(new ResolverError(
                ResolverErrorKind.RequestTooLong,
                task.request
            ));
            return;
        }

        // Write full message length at offset 0. See RFC 1035 section 4.2.2.
        buffer.writeUInt16BE(writer.offset() - 2, 0);

        socket.write(buffer.slice(0, writer.offset()));
    }

    protected closeSocket(socket: net.Socket) {
        if (socket) {
            socket.end();
        }
    }
}

class ResolverSocketUDP extends ResolverSocketTransport<dgram.Socket> {
    private readonly onRequestTooLarge: (task: ResolverSocketTask) => void;

    public constructor(
        onError: (error: Error) => void,
        onRequestTooLarge: (task: ResolverSocketTask) => void,
        options: ResolverSocketOptions
    ) {
        super(onError, options);
        this.onRequestTooLarge = onRequestTooLarge;
    }

    protected openSocket(): dgram.Socket {
        let socket: dgram.Socket;
        if (net.isIPv4(this.options.address)) {
            socket = dgram.createSocket("udp4");
        } else {
            socket = dgram.createSocket("udp6");
        }
        socket.on("close", () => this.onClosed(false));
        socket.on("error", error => {
            this.onUnrecoverableError(error);
            socket.close();
        });
        socket.on("listening", () => this.onOpened());
        socket.on("message", (responseBuffer, info) => {
            try {
                const response = Message.read(responseBuffer);
                this.onMessageReceived(response);
            } catch (error) {
                this.onUnrecoverableError(error);
            }
        });
        socket.bind();
        return socket;
    }

    protected send(socket: dgram.Socket, task: ResolverSocketTask) {
        const writer = new Writer(this.options.buffer.slice(0, 512));
        task.request.write(writer);
        if (writer.overflowed) {
            this.forget(task);
            this.onRequestTooLarge(task);
            return;
        }
        socket.send(
            this.options.buffer.slice(0, writer.offset()),
            this.options.port,
            this.options.address
        );
    }

    public closeSocket(socket: dgram.Socket) {
        if (socket) {
            socket.close();
        }
    }
}

class ResolverSocketTask {
    /**
     * @param request Request to send and await response to.
     * @param resolve Function used to signal task resolution.
     * @param reject Function used to signal task failure.
     * @param retriesLeft Amount of additional times request may be resent if
     * unanswered.
     */
    public constructor(
        public readonly request: Message,
        public readonly resolve: (response: Message) => void,
        public readonly reject: (error: ResolverError) => void,
        public retriesLeft: number = 0,
    ) { }

    /** The timestamp (tick) at which the request was sent, if at all. */
    public timestampSent?: number;
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
     * Message buffer.
     *
     * Used for sending and receiving messages. The buffer must be large enough
     * to house any messages of interest.
     */
    readonly buffer?: Buffer;

    /**
     * Time to keep socket open after successfully sending and receiving, in
     * milliseconds.
     *
     * Defaults to 3000 (3 seconds).
     */
    readonly keepOpenForMs?: number;

    /**
     * Called, if given, whenever an error occurrs that cannot be meaningfully
     * dealt with by the socket.
     */
    readonly onIgnoredError?: (error: ResolverError) => void;

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
