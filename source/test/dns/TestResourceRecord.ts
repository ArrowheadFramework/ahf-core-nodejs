import {DClass, PTR, ResourceRecord, TSIG, Type} from "../../main/dns/";
import * as unit from "../unit";
import * as utils from "./utils";

export const TestResourceRecord: unit.Suite = {
    name: "ResourceRecord",
    units: [
        {
            name: "Decode and encode PTR record",
            test: () => utils.readWriteAndCompare(
                Buffer.from([
                    // 5 alpha
                    0x05, 0x61, 0x6c, 0x70, 0x68, 0x61,
                    // 9 arrowhead
                    0x09, 0x61, 0x72, 0x72, 0x6f, 0x77, 0x68, 0x65, 0x61, 0x64,
                    // 3 org
                    0x03, 0x6f, 0x72, 0x67,
                    // 0
                    0x00,
                    // TYPE.PTR (12)
                    0x00, 0x0c,
                    // DClass.IN (1)
                    0x00, 0x01,
                    // 30
                    0x00, 0x00, 0x00, 0x1e,
                    // 20 (RDLENGTH)
                    0x00, 0x14,
                    // 4 beta
                    0x04, 0x62, 0x65, 0x74, 0x61,
                    // 9 arrowhead
                    0x09, 0x61, 0x72, 0x72, 0x6f, 0x77, 0x68, 0x65, 0x61, 0x64,
                    // 3 org
                    0x03, 0x6f, 0x72, 0x67,
                    // 0
                    0x00,
                ]),
                ResourceRecord.read,
                new ResourceRecord(
                    "alpha.arrowhead.org.",
                    Type.PTR, DClass.IN, 30,
                    new PTR("beta.arrowhead.org.")
                )
            )
        },
        {
            name: "Decode and encode TSIG record",
            test: () => utils.readWriteAndCompare(
                Buffer.from([
                    // 5 alpha
                    0x05, 0x61, 0x6c, 0x70, 0x68, 0x61,
                    // 9 arrowhead
                    0x09, 0x61, 0x72, 0x72, 0x6f, 0x77, 0x68, 0x65, 0x61, 0x64,
                    // 3 org
                    0x03, 0x6f, 0x72, 0x67,
                    // 0
                    0x00,
                    // TYPE.TSIG (250)
                    0x00, 0xfa,
                    // DClass.IN (1)
                    0x00, 0x01,
                    // 30
                    0x00, 0x00, 0x00, 0x1e,
                    // 30 (RDLENGTH)
                    0x00, 0x1e,
                    // 9 hmac-sha1
                    0x09, 0x68, 0x6d, 0x61, 0x63, 0x2d, 0x73, 0x68, 0x61, 0x31,
                    // 0
                    0x00,
                    // 100
                    0x00, 0x00, 0x00, 0x00, 0x00, 0x64,
                    // 300
                    0x01, 0x2c,
                    // 2 [0xfe, 0x1c]
                    0x00, 0x02, 0xfe, 0x1c,
                    // 200
                    0x00, 0xc8,
                    // 0
                    0x00, 0x00,
                    // 1 [0xff]
                    0x00, 0x01, 0xff,
                ]),
                ResourceRecord.read,
                new ResourceRecord(
                    "alpha.arrowhead.org.",
                    Type.TSIG, DClass.IN, 30,
                    new TSIG(
                        "hmac-sha1.",
                        100, 300,
                        Buffer.from([0xfe, 0x1c]),
                        200, 0,
                        Buffer.from([0xff])
                    )
                )
            )
        },
    ],
};