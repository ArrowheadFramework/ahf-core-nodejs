import * as assert from "assert";
import * as io from "../../main/dns/io";

const _buffer = Buffer.alloc(65535);

export function readAndCompare(buffer: Buffer, read: Read, expected: any) {
    const reader = new io.Reader(buffer);
    const actual = read(reader);
    assert.deepStrictEqual(actual, expected);
}

export function readWriteAndCompare(
    buffer: Buffer,
    read: Read,
    writable: Writable
) {
    readAndCompare(buffer, read, writable);
    writeAndCompare(writable, buffer);
}

export function writeAndCompare(writable: Writable, buffer: Buffer) {
    const writer = new io.Writer(_buffer);
    writable.write(writer);
    if (writer.offset() !== buffer.length) {
        const length = Math.min(writer.offset(), buffer.length) + 3;
        assert.fail(
            writer.sink.toString("hex", 0, length) + "...",
            buffer.toString("hex")
        );
    }
    if (buffer.compare(writer.sink, 0, buffer.length) !== 0) {
        assert.fail(
            writer.sink.toString("hex", 0, buffer.length),
            buffer.toString("hex")
        );
    }
};

export type Read = (reader: io.Reader) => any;

export interface Writable {
    write(writer: io.Writer);
}