/**
 * An RFC 1035 compatible byte buffer reader.
 */
export class Reader {
    private cursor: number;
    private end: number;

    /**
     * Buffer read from by this reader.
     */
    public readonly source: Buffer;

    public constructor(source: Buffer, offset = 0, end?: number) {
        this.cursor = offset;
        this.end = end ? Math.min(end, source.length) : source.length;
        this.source = source;
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
                .toString("binary")
                .replace(".", "\\.") + ".";
        };
        return name;
    }

    public readString(): string {
        return this.read(this.readU8()).toString("binary");
    }

    public readStrings(): string[] {
        const strings = new Array();
        let length;
        do {
            length = this.readU8();
            strings.push(this.read(length).toString("binary"));
        } while (length > 0);
        return strings;
    }

    public readU8(): number {
        if (this.cursor + 1 > this.end) {
            return 0;
        }
        const u8 = this.source.readUInt8(this.cursor);
        this.cursor += 1;
        return u8;
    }

    public readU16(): number {
        if (this.cursor + 2 > this.end) {
            return 0;
        }
        const u16 = this.source.readUInt16BE(this.cursor);
        this.cursor += 2;
        return u16;
    }

    public readU32(): number {
        if (this.cursor + 4 > this.end) {
            return 0;
        }
        const u32 = this.source.readUInt32BE(this.cursor);
        this.cursor += 4;
        return u32;
    }

    public readU48(): number {
        if (this.cursor + 6 > this.end) {
            return 0;
        }
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
    private cursor: number;
    private end: number;

    /**
     * The buffer written to by this writer.
     */
    public readonly sink: Buffer;

    /**
     * Whether or not any write operation previously performed has been
     * cancelled due to insufficient remaning sink space.
     */
    public overflowed: boolean;

    public constructor(sink: Buffer, offset = 0, end?: number) {
        this.cursor = offset;
        this.end = end ? Math.min(end, sink.length) : sink.length;
        this.sink = sink;
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
        if (this.cursor + source.length > this.end) {
            this.overflowed = true;
            return;
        }
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
            labels.push(label);
        }
        this.writeStrings(labels, 0x3f);
    }

    public writeString(string: string = "") {
        this.writeU8(string.length);
        this.cursor += this.sink.write(string, this.cursor);
    }

    public writeStrings(strings: string[] = [], lengthMask = 0xff) {
        strings.forEach(string => {
            const length = string.length & lengthMask;
            if (length > 0) {
                this.writeU8(length);
                this.cursor += this.sink.write(string, this.cursor, length);
            }
        });
        this.writeU8(0);
    }

    public writeU8(u8: number = 0) {
        if (this.cursor + 1 > this.end) {
            this.overflowed = true;
            return;
        }
        this.cursor = this.sink.writeUInt8(u8, this.cursor);
    }

    public writeU16(u16: number = 0) {
        if (this.cursor + 2 > this.end) {
            this.overflowed = true;
            return;
        }
        this.cursor = this.sink.writeUInt16BE(u16, this.cursor);
    }

    public writeU32(u32: number = 0) {
        if (this.cursor + 4 > this.end) {
            this.overflowed = true;
            return;
        }
        this.cursor = this.sink.writeUInt32BE(u32, this.cursor);
    }

    public writeU48(u48: number = 0) {
        if (this.cursor + 6 > this.end) {
            this.overflowed = true;
            return;
        }
        this.cursor = this.sink.writeUInt16BE(u48 / 4294967296, this.cursor);
        this.cursor = this.sink.writeUInt32BE(u48 & 0xffffffff, this.cursor);
    }
}