import {Reader, Writer} from "./io";
import {read as readResourceData, ResourceData} from "./ResourceData";

/**
 * A DNS resource record, as described by RFC 1035.
 */
export class ResourceRecord {
    /**
     * Amount of bytes required to house the serialized form of this record
     * as produced by the `write()` method of this instance.
     */
    public readonly byteLength: number;

    /**
     * Creates new reasource record from given parameters.
     */
    public constructor(
        public readonly name: string,
        public readonly type: number,
        public readonly dclass: number,
        public readonly ttl: number = 0,
        public readonly rdata?: ResourceData
    ) {
        this.byteLength = 10 + name.length + (name.endsWith(".") ? 1 : 2) +
            (rdata ? rdata.byteLength : 0);
    }

    /**
     * Reads record from given reader.
     *
     * @param reader Reader containing record data.
     * @param isQuestion Whether record is read from `Message` questions part.
     */
    public static read(reader: Reader, isQuestion = false): ResourceRecord {
        const name = reader.readName();
        const type = reader.readU16();
        const dclass = reader.readU16();

        if (isQuestion) {
            return new ResourceRecord(name, type, dclass);
        }

        const ttl = reader.readU32();
        const rdlength = reader.readU16();
        const rdreader = reader.pop(rdlength);
        const rdata = readResourceData(type, rdlength, rdreader);

        return new ResourceRecord(name, type, dclass, ttl, rdata);
    }

    /**
     * Writes record to writer.
     *
     * @param writer Writer to receive record data.
     * @param isQuestion Whether record is to be part of `Message` questions.
     */
    public write(writer: Writer, isQuestion = false) {
        writer.writeName(this.name);
        writer.writeU16(this.type);
        writer.writeU16(this.dclass);
        if (isQuestion) {
            return;
        }
        writer.writeU32(this.ttl);
        if (this.rdata) {
            const rdlengthWriter = writer.pop(2);

            const offset = writer.offset();
            this.rdata.write(writer);

            const rdlength = writer.offset() - offset;
            rdlengthWriter.writeU16(rdlength);
        } else {
            writer.writeU16(0);
        }
    }
}
