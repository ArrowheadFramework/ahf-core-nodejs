import { DClass, OpCode, Type } from "../../main/dns/constants";
import { Message } from "../../main/dns/Message";
import * as rd from "../../main/dns/ResourceData";
import { ResourceRecord } from "../../main/dns/ResourceRecord";
import * as unit from "../unit";
import * as utils from "./utils";

export const TestMessage: unit.Suite = {
    name: "Message",
    units: [
        {
            name: "Decode and encode PTR query",
            test: recorder => utils.readWriteAndCompare(
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
            )
        },
    ],
};