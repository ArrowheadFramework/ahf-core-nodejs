/**
 * An RFC 1035 compatible byte buffer reader.
 */
export class Reader {
    private readonly source: Buffer;

    private cursor: number;
    private readonly end: number;

    /**
     * Creates new DNS reader.
     *
     * @param source Source of reads.
     * @param offset Offset from beginning of source where reading will start.
     * @param end Offset from beginning of source reading may not pass.
     */
    public constructor(source: Buffer, offset = 0, end?: number) {
        this.source = source;

        this.cursor = offset;
        this.end = end ? Math.min(end, source.length) : source.length;
    }

    /**
     * Consumes `length` bytes and returns new `Reader` that can only read from
     * the consumed region.
     *
     * @param length Amount of bytes to consume.
     * @return New reader.
     */
    public pop(length: number): Reader {
        const reader = new Reader(
            this.source,
            this.cursor,
            this.cursor + length
        );
        this.cursor += length;
        return reader;
    }

    /**
     * Forwards the internal cursor `length` bytes and returns a `Buffer`
     * referring to the skipped bytes.
     *
     * Note that writing to the returned buffer will cause the buffer wrapped
     * by this `Reader` to be modified.
     *
     * @param length Amount of bytes to read.
     */
    public read(length: number): Buffer {
        const cursor = Math.min(this.end, this.cursor + length);
        const buffer = this.source.slice(this.cursor, cursor);
        this.cursor = cursor;
        return buffer;
    }

    /**
     * @return A read DNS name.
     */
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
        }
        return name;
    }

    /**
     * @return A series of read DNS character strings.
     */
    public readStrings(): string[] {
        const strings = [];
        let length;
        do {
            length = this.readU8();
            strings.push(this.read(length).toString());
        } while (length > 0);
        return strings;
    }

    /**
     * @return Read byte.
     */
    public readU8(): number {
        const u8 = this.source.readUInt8(this.cursor);
        this.cursor += 1;
        return u8;
    }

    /**
     * @return Read unsigned 16-bit word.
     */
    public readU16(): number {
        const u16 = this.source.readUInt16BE(this.cursor);
        this.cursor += 2;
        return u16;
    }

    /**
     * @return Read unsigned 32-bit word.
     */
    public readU32(): number {
        const u32 = this.source.readUInt32BE(this.cursor);
        this.cursor += 4;
        return u32;
    }

    /**
     * @return Read unsigned 48-bit word.
     */
    public readU48(): number {
        const hi = this.source.readUInt16BE(this.cursor);
        const lo = this.source.readUInt32BE(this.cursor + 2);
        this.cursor += 6;
        return (hi * 4294967296) + lo;
    }
}

/**
 * An RFC 1035 compatible byte buffer writer.
 */
export class Writer {
    private readonly sink: Buffer;

    private readonly begin: number;
    private cursor: number;
    private end: number;

    /**
     * Creates new DNS writer.
     *
     * Note that the provided `sink` must be large enough to house whatever is
     * intended to be written.
     *
     * @param sink Target of writes.
     * @param offset Offset from beginning of sink where writing will start.
     * @param end Offset from beginning of sink writing may not pass.
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

    /**
     * Offset from internal cursor starting position. Will always be exactly
     * the same as the amount of bytes written.
     *
     * @return Writer offset.
     */
    public offset(): number {
        return this.cursor;
    }

    /**
     * Consumes `length` bytes and returns new `Writer` that can only write to
     * the consumed region.
     *
     * @param length Amount of bytes to consume.
     * @return New writer.
     */
    public pop(length: number): Writer {
        const writer = new Writer(
            this.sink,
            this.cursor,
            this.cursor + length
        );
        this.cursor += length;
        return writer;
    }

    /**
     * Writes contents of entire given buffer.
     *
     * @param source Buffer to write.
     */
    public write(source: Buffer) {
        this.cursor += source.copy(this.sink, this.cursor);
    }

    /**
     * Writes given string as a DNS name, which is a series of labels separated
     * by ASCII dots. Backslash (\) may be used to escape dots or other
     * backslashes.
     *
     * No label of a DNS name may be longer than 63 bytes.
     *
     * @param name Name to write.
     */
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

    /**
     * Writes series of short strings.
     *
     * @param strings Strings to write.
     * @param lengthLimit Longest allowed individual string. May not be larger
     * than 255.
     */
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

    /**
     * @param u8 Byte to write.
     */
    public writeU8(u8: number) {
        this.cursor = this.sink.writeUInt8(u8, this.cursor);
    }

    /**
     * @param u16 Unsigned 16-bit word to write.
     */
    public writeU16(u16: number) {
        this.cursor = this.sink.writeUInt16BE(u16, this.cursor);
    }

    /**
     * @param u32 Unsigned 32-bit word to write.
     */
    public writeU32(u32: number) {
        this.cursor = this.sink.writeUInt32BE(u32, this.cursor);
    }

    /**
     * @param u48 Unsigned 48-bit word to write.
     */
    public writeU48(u48: number) {
        this.cursor = this.sink.writeUInt16BE(u48 / 4294967296, this.cursor);
        this.cursor = this.sink.writeUInt32BE(u48 & 0xffffffff, this.cursor);
    }
}