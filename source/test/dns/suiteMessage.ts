import {
    DClass,
    OpCode,
    Type,
    Message,
    ResourceRecord,
    TransactionSigner
} from "../../main/dns";
import * as unit from "../unit";
import * as utils from "./utils";

export const suiteMessage: unit.Suite = {
    name: "Message",

    "Decode and encode PTR query": () => utils.readWriteAndCompare(
        Buffer.from([
            // 12345 (ID)
            0x30, 0x39,
            // QR=0, OPCODE=0, AA=0, TC=0, RA=0, RD=1, Z=0, RCODE=0
            0x01, 0x00,
            // 1 (QDCOUNT)
            0x00, 0x01,
            // 0 (ANCOUNT)
            0x00, 0x00,
            // 0 (NSCOUNT)
            0x00, 0x00,
            // 0 (ARCOUNT)
            0x00, 0x00,
            // 5 alpha
            0x05, 0x61, 0x6c, 0x70, 0x68, 0x61,
            // 9 arrowhead
            0x09, 0x61, 0x72, 0x72, 0x6f, 0x77, 0x68, 0x65, 0x61, 0x64,
            // 3 org
            0x03, 0x6f, 0x72, 0x67,
            // 0
            0x00,
            // 12 (TYPE=PTR)
            0x00, 0x0c,
            // 1 (DClass=IN)
            0x00, 0x01,
        ]),
        Message.read,
        new Message(
            12345,
            {
                qr: false,
                opcode: OpCode.QUERY,
                aa: false,
                tc: false,
                ra: false,
                rd: true,
                z: 0,
                rcode: 0,
            },
            [
                new ResourceRecord(
                    "alpha.arrowhead.org.",
                    Type.PTR,
                    DClass.IN
                ),
            ],
        )
    ),
    "Encode TSIG update": () => utils.writeAndCompare(
        new Message(
            37352,
            {
                qr: false,
                opcode: OpCode.QUERY,
                aa: false,
                tc: false,
                ra: false,
                rd: false,
                z: 0,
                rcode: 0,
            },
            [
                new ResourceRecord(
                    "beta.arrowhead.org.",
                    Type.SOA,
                    DClass.IN
                ),
            ],
            [],
            [],
            [],
            new TransactionSigner(
                "VQEOSuLEGcsnJqjOJKnjbA==",
                "key.arrowhead.org.",
                "hmac-md5.sig-alg.reg.int",
                300,
                new Date(1506594227000),
            ),
        ),
        Buffer.from([
            // 37352 (ID)
            0x91, 0xe8,
            // QR=0, OPCODE=0, AA=0, TC=0, RA=0, RD=0, Z=0, RCODE=0
            0x00, 0x00,
            // 1 (QDCOUNT)
            0x00, 0x01,
            // 0 (ANCOUNT)
            0x00, 0x00,
            // 0 (ANCOUNT)
            0x00, 0x00,
            // 1 (ARCOUNT)
            0x00, 0x01,
            // 4 beta
            0x04, 0x62, 0x65, 0x74, 0x61,
            // 9 arrowhead
            0x09, 0x61, 0x72, 0x72, 0x6f, 0x77, 0x68, 0x65, 0x61, 0x64,
            // 3 org
            0x03, 0x6f, 0x72, 0x67,
            // 0
            0x00,
            // 6 (TYPE=SOA)
            0x00, 0x06,
            // 1 (DClass=IN)
            0x00, 0x01,
            // 3 key
            0x03, 0x6b, 0x65, 0x79,
            // 9 arrowhead
            0x09, 0x61, 0x72, 0x72, 0x6f, 0x77, 0x68, 0x65, 0x61, 0x64,
            // 3 org
            0x03, 0x6f, 0x72, 0x67,
            // 0
            0x00,
            // 250 (TYPE=TSIG)
            0x00, 0xfa,
            // 255 (DClass=ANY)
            0x00, 0xff,
            // 0 (TTL)
            0x00, 0x00, 0x00, 0x00,
            // 58 (RDLENGTH)
            0x00, 0x3a,
            // 8 hmac-md5
            0x08, 0x68, 0x6d, 0x61, 0x63, 0x2d, 0x6d, 0x64, 0x35,
            // 7 sig-alg
            0x07, 0x73, 0x69, 0x67, 0x2d, 0x61, 0x6c, 0x67,
            // 3 reg
            0x03, 0x72, 0x65, 0x67,
            // 3 int
            0x03, 0x69, 0x6e, 0x74,
            // 0
            0x00,
            // 1506594227 (Time signed)
            0x00, 0x00, 0x59, 0xcc, 0xcd, 0xb3,
            // 300 (Fugde)
            0x01, 0x2c,
            // 16 (Mac size)
            0x00, 0x10,
            // MAC
            0x52, 0xfb, 0x20, 0xed, 0xcf, 0xbc, 0x96, 0x5d,
            0x2b, 0x04, 0x1c, 0x13, 0x4e, 0xf3, 0x2f, 0x6b,
            // 37352 (Original ID)
            0x91, 0xe8,
            // 0 (NOERROR)
            0x00, 0x00,
            // 0 (Other len)
            0x00, 0x00,
        ]),
    ),
};