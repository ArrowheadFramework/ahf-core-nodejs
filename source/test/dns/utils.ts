import * as assert from "assert";
import * as io from "../../main/dns/io";

export type Read = (reader: io.Reader) => any;

export interface Writable {
    write(writer: io.Writer);
}

const _buffer = Buffer.alloc(65535);

export function readAndCompare(buffer: Buffer, read: Read, expected: any) {
    const reader = new io.Reader(buffer);
    const actual = read(reader);
    assert.deepStrictEqual(actual, expected);
}

export function readWriteAndCompare(buffer: Buffer, read: Read, writable: Writable) {
    readAndCompare(buffer, read, writable);
    writeAndCompare(writable, buffer);
}

export function writeAndCompare(writable: Writable, buffer: Buffer) {
    const writer = new io.Writer(_buffer);
    writable.write(writer);
    if (buffer.compare(writer.buffer()) !== 0) {
        assert.fail(
            writer.buffer().toString("hex", 0, buffer.length),
            buffer.toString("hex")
        );
    }
}