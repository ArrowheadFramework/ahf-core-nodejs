/**
 * An RFC 1035 compatible byte buffer reader.
 *
 * All methods return 0 or nothing if reading past end of wrapped buffer.
 */
export class Reader {
    private readonly source: Buffer;

    private cursor: number;
    private end: number;

    /**
     * Buffer read from.
     */
    public constructor(source: Buffer, offset = 0, end?: number) {
        this.source = source;

        this.cursor = offset;
        this.end = end ? Math.min(end, source.length) : source.length;
    }

    public pop(length: number): Reader {
        const reader = new Reader(
            this.source,
            this.cursor,
            this.cursor + length
        );
        this.cursor += length;
        return reader;
    }

    public read(length: number): Buffer {
        const cursor = Math.min(this.end, this.cursor + length);
        const buffer = this.source.slice(this.cursor, cursor);
        this.cursor = cursor;
        return buffer;
    }

    public readName(): string {
        let name = "";
        let length;
        while ((length = this.readU8()) !== 0) {
            if (length > 63) {
                this.cursor -= 1;
                const field = this.readU16() & 0x3fff;
                if ((length & 0xc0) === 0xc0) {
                    name += new Reader(this.source, field).readName();
                }
                break;
            }
            name += this.read(length)
                .toString()
                .replace(".", "\\.") + ".";
        };
        return name;
    }

    public readStrings(): string[] {
        const strings = new Array();
        let length;
        do {
            length = this.readU8();
            strings.push(this.read(length).toString());
        } while (length > 0);
        return strings;
    }

    public readU8(): number {
        const u8 = this.source.readUInt8(this.cursor);
        this.cursor += 1;
        return u8;
    }

    public readU16(): number {
        const u16 = this.source.readUInt16BE(this.cursor);
        this.cursor += 2;
        return u16;
    }

    public readU32(): number {
        const u32 = this.source.readUInt32BE(this.cursor);
        this.cursor += 4;
        return u32;
    }

    public readU48(): number {
        const hi = this.source.readUInt16BE(this.cursor);
        const lo = this.source.readUInt32BE(this.cursor + 2);
        this.cursor += 6;
        return (hi * 4294967296) + lo;
    }
}

/**
 * An RFC 1035 compatible byte buffer writer.
 *
 * Throws exception if writing past end of wrapped buffer.
 */
export class Writer {
    private readonly sink: Buffer;

    private begin: number;
    private cursor: number;
    private end: number;

    /**
     * Buffer written to.
     */
    public constructor(sink: Buffer, offset = 0, end?: number) {
        this.sink = sink;

        this.begin = offset;
        this.cursor = offset;
        this.end = end ? Math.min(end, sink.length) : sink.length;
    }

    /**
     * Provides a window to the portion of the internal buffer that has been
     * written to. Note that modifying the returned buffer will also cause the
     * internal buffer to be modified.
     *
     * @return Reference to the part of the wrapped `Buffer` written to.
     */
    public buffer(): Buffer {
        return this.sink.slice(this.begin, this.cursor);
    }

    public offset(): number {
        return this.cursor;
    }

    public pop(length: number): Writer {
        const writer = new Writer(
            this.sink,
            this.cursor,
            this.cursor + length
        );
        this.cursor += length;
        return writer;
    }

    public write(source: Buffer) {
        this.cursor += source.copy(this.sink, this.cursor);
    }

    public writeName(name: string = "") {
        const labels = [];
        let label = "";
        for (let i = 0; i < name.length; ++i) {
            const c = name.charAt(i);
            switch (c) {
                case ".":
                    labels.push(label);
                    label = "";
                    break;

                case "\\":
                    if (++i < name.length) {
                        label += name.charAt(i);
                    }
                    break;

                default:
                    label += c;
            }
        }
        if (label.length > 0) {
            labels.push(label.toLowerCase());
        }
        this.writeStrings(labels, 63);
    }

    public writeStrings(strings: string[] = [], lengthLimit = 255) {
        if (lengthLimit > 255) {
            throw new Error("Length limit too large: " + lengthLimit);
        }
        for (let string of strings) {
            const length = string.length;
            if (length > lengthLimit) {
                throw new Error("Too long (> " + lengthLimit + "): " + string);
            }
            if (length > 0) {
                this.writeU8(length);
                this.cursor += this.sink.write(string, this.cursor, length);
            }
        }
        this.writeU8(0);
    }

    public writeU8(u8: number) {
        this.cursor = this.sink.writeUInt8(u8, this.cursor);
    }

    public writeU16(u16: number) {
        this.cursor = this.sink.writeUInt16BE(u16, this.cursor);
    }

    public writeU32(u32: number) {
        this.cursor = this.sink.writeUInt32BE(u32, this.cursor);
    }

    public writeU48(u48: number) {
        this.cursor = this.sink.writeUInt16BE(u48 / 4294967296, this.cursor);
        this.cursor = this.sink.writeUInt32BE(u48 & 0xffffffff, this.cursor);
    }
}