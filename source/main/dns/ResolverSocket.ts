import { OpCode, RCode } from "./constants";
import * as dgram from "dgram";
import * as events from "events";
import { Reader, Writer } from "./io";
import { Message } from "./Message";
import * as net from "net";
import { ResolverError, ResolverErrorKind } from "./Resolver";

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

    private readonly queueTCP: Sender;
    private readonly queueUDP: Sender;

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
            onErrorIgnored: options.onErrorIgnored || (error => {
                console.debug("Ignored by Resolver Socket: " + error);
            }),
            port: options.port || 53,
            timeoutInMs: options.timeoutInMs || 10000,
        };

        const ignoreUnexpectedResponse = response =>
            this.options.onErrorIgnored(new ResolverError(
                ResolverErrorKind.ResponseIDUnexpected,
                undefined,
                response
            ));
        const rejectAsTooLong = task =>
            task.reject(new ResolverError(
                ResolverErrorKind.RequestTooLong,
                task.request
            ));
        const resolveTaskWithResponse = (task, response) =>
            task.resolve(response);

        this.queueTCP = new SenderTCP(this.options);
        this.queueTCP.on("overflow", rejectAsTooLong);
        this.queueTCP.on("response", resolveTaskWithResponse);
        this.queueTCP.on("unexpected", ignoreUnexpectedResponse);

        this.queueUDP = new SenderUDP(this.options);
        this.queueUDP.on("overflow", (task, length) => {
            if (length <= this.options.buffer.length - 2) {
                this.queueTCP.enqueue(task);
            } else {
                rejectAsTooLong(task);
            }
        });
        this.queueUDP.on("response", resolveTaskWithResponse);
        this.queueUDP.on("unexpected", ignoreUnexpectedResponse);
    }

    /**
     * Attempts to send DNS message to DNS server.
     *
     * @param request Message to send.
     */
    public send(request: Message): Promise<Message> {
        return new Promise((resolve, reject) => {
            const task = new Task(request, resolve, reject);
            if (request.flags.opcode !== OpCode.UPDATE) {
                task.retriesLeft = 2;
                this.queueUDP.enqueue(task);
            } else {
                this.queueTCP.enqueue(task);
            }
        });
    }

    /**
     * Closes socket.
     */
    public close() {
        this.queueTCP.close();
        this.queueUDP.close();
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
    ) { }

    public timeSentUnixMs?: number;
}

interface Sender extends events.EventEmitter {
    close();

    dequeue(id: number): Task;
    dequeueAll(): Task[];
    enqueue(task: Task);

    on(event: "overflow", r: (task: Task, length: number) => void): this;
    on(event: "response", r: (task: Task, response: Message) => void): this;
    on(event: "unexpected", r: (response: Message) => void): this;
}

abstract class SenderBase extends events.EventEmitter implements Sender {
    private readonly inbound: Map<number, Task>;

    private closer: NodeJS.Timer;
    private outbound: Array<Task>;

    protected constructor(
        private readonly transport: Transport,
        private readonly options: ResolverSocketOptions,
    ) {
        super();
        this.inbound = new Map();
        this.outbound = [];

        const rejectAll = (reason: any) => this.dequeueAll()
            .forEach(task =>
                task.reject(reason instanceof ResolverError
                    ? new ResolverError(
                        reason.kind,
                        reason.request || task.request,
                        reason.response,
                        reason.reason
                    )
                    : new ResolverError(
                        ResolverErrorKind.Other,
                        task.request,
                        undefined,
                        reason
                    )));

        transport.on("close", () => this.poll());
        transport.on("error", rejectAll);
        transport.on("open", () => this.poll());
        transport.on("overflow", (request, length) =>
            this.emit("overflow", this.dequeue(request.id), length));
        transport.on("response", response => {
            const task = this.dequeue(response.id);
            if (!task) {
                this.emit("unexpected", response);
            } else {
                this.emit("response", task, response);
            }
        });
        transport.on("timeout", () => rejectAll(new ResolverError(
            ResolverErrorKind.RequestUnanswered
        )));

        setInterval(() => {
            if (this.inbound.size === 0) {
                return;
            }
            const threshold = new Date().getTime() - this.options.timeoutInMs;
            for (const [id, task] of this.inbound) {
                if (threshold >= task.timeSentUnixMs) {
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
        }, Math.max(options.timeoutInMs / 20, 50)).unref();
    }

    public close() {
        this.transport.close();
    }

    public dequeue(id: number): Task {
        for (let i = 0; i < this.outbound.length; ++i) {
            const task = this.outbound[i];
            if (task.request.id === id) {
                this.outbound.splice(i, 1);
                return task;
            }
        }

        const task = this.inbound.get(id);
        if (task) {
            this.inbound.delete(id);
            return task;
        }

        return null;
    }

    public dequeueAll(): Task[] {
        const tasks = this.outbound;
        for (let task of this.inbound.values()) {
            tasks.push(task);
        }
        this.inbound.clear();
        this.outbound = [];
        return tasks;
    }

    public enqueue(task: Task) {
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

    private poll() {
        if (this.outbound.length === 0) {
            return;
        }
        if (!this.transport.opened()) {
            this.transport.open();
            return;
        }
        this.outbound.forEach(task => {
            this.transport.send(task.request);
            task.timeSentUnixMs = new Date().getTime();
            this.inbound.set(task.request.id, task);
        });
        this.outbound = [];

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
        if (this.inbound.size === 0 && this.outbound.length === 0) {
            if (this.transport) {
                this.transport.close();
            }
            return true;
        }
        return false;
    }
}

class SenderTCP extends SenderBase {
    public constructor(options: ResolverSocketOptions) {
        super(new TransportTCP(options), options);
    }
}

class SenderUDP extends SenderBase {
    public constructor(options: ResolverSocketOptions) {
        super(new TransportUDP(options), options);
    }
}

interface Transport extends events.EventEmitter {
    open();
    opened(): boolean;
    close();

    send(request: Message);

    on(event: "close", r: () => void): this;
    on(event: "error", r: (error: any) => void): this;
    on(event: "overflow", r: (request: Message, length: number) => void): this;
    on(event: "response", r: (response: Message) => void): this;
    on(event: "open", r: () => void): this;
    on(event: "timeout", r: () => void): this;
}

class TransportTCP extends events.EventEmitter implements Transport {
    private isOpen: boolean;
    private isTimedOut: boolean;
    private socket: net.Socket;

    public constructor(
        private readonly options: ResolverSocketOptions,
    ) {
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

        this.socket.on("close", hadError => {
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
        const buffer = this.options.buffer;
        const writer = new Writer(buffer, 2);

        request.write(writer);
        if (request.transactionSigner) {
            request.transactionSigner
                .sign(request.id, buffer.slice(2, writer.offset()))
                .write(writer);

            // Increment ARCOUNT. See RFC 2845 section 3.4.1.
            buffer.writeUInt16BE(request.additionals.length + 1, 10 + 2);
        }

        if (writer.overflowed) {
            this.emit("overflow", request, this.options.buffer.length);
            return;
        }

        // Write full message length at offset 0. See RFC 1035 section 4.2.2.
        buffer.writeUInt16BE(writer.offset() - 2, 0);

        this.socket.write(buffer.slice(0, writer.offset()));
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
        const writer = new Writer(this.options.buffer);
        request.write(writer);
        if (writer.offset() > 512 || writer.overflowed) {
            this.emit("overflow", request, writer.overflowed
                ? this.options.buffer.length
                : writer.offset());
            return;
        }
        this.socket.send(
            this.options.buffer.slice(0, writer.offset()),
            this.options.port,
            this.options.address
        );
    }
}
