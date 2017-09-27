import * as rd from "../../main/dns/ResourceData";
import * as unit from "../unit";
import * as utils from "./utils";

export const TestResourceData: unit.Suite = {
    name: "ResourceData",
    units: [
        {
            name: "Encode A",
            test: recorder => utils.writeAndCompare(
                new rd.A("127.0.0.1"),
                Buffer.from([
                    0x7f, 0x00, 0x00, 0x01,
                ])
            ),
        },
        {
            name: "Encode AAAA",
            test: recorder => utils.writeAndCompare(
                new rd.AAAA("fe80::72fb:63f5:b321:6a9e"),
                Buffer.from([
                    0xfe, 0x80, 0x00, 0x00,
                    0x00, 0x00, 0x00, 0x00,
                    0x72, 0xfb, 0x63, 0xf5,
                    0xb3, 0x21, 0x6a, 0x9e,
                ])
            ),
        },
        {
            name: "Encode CNAME",
            test: recorder => utils.writeAndCompare(
                new rd.CNAME("alpha.arrowhead.org"),
                Buffer.from([
                    // 5 alpha
                    0x05, 0x61, 0x6c, 0x70, 0x68, 0x61,
                    // 9 arrowhead
                    0x09, 0x61, 0x72, 0x72, 0x6f, 0x77, 0x68, 0x65, 0x61, 0x64,
                    // 3 org
                    0x03, 0x6f, 0x72, 0x67,
                    // 0
                    0x00,
                ])
            ),
        },
        {
            name: "Encode MX",
            test: recorder => utils.writeAndCompare(
                new rd.MX(1234, "beta.arrowhead.org."),
                Buffer.from([
                    // 1234
                    0x04, 0xd2,
                    // 4 beta
                    0x04, 0x62, 0x65, 0x74, 0x61,
                    // 9 arrowhead
                    0x09, 0x61, 0x72, 0x72, 0x6f, 0x77, 0x68, 0x65, 0x61, 0x64,
                    // 3 org
                    0x03, 0x6f, 0x72, 0x67,
                    // 0
                    0x00,
                ])
            ),
        },
        {
            name: "Encode NS",
            test: recorder => utils.writeAndCompare(
                new rd.NS("gamma.arrowhead.org."),
                Buffer.from([
                    // 5 gamma
                    0x05, 0x67, 0x61, 0x6d, 0x6d, 0x61,
                    // 9 arrowhead
                    0x09, 0x61, 0x72, 0x72, 0x6f, 0x77, 0x68, 0x65, 0x61, 0x64,
                    // 3 org
                    0x03, 0x6f, 0x72, 0x67,
                    // 0
                    0x00,
                ])
            ),
        },

        {
            name: "Encode PTR",
            test: recorder => utils.writeAndCompare(
                new rd.PTR("delta.arrowhead.org."),
                Buffer.from([
                    // 5 delta
                    0x05, 0x64, 0x65, 0x6c, 0x74, 0x61,
                    // 9 arrowhead
                    0x09, 0x61, 0x72, 0x72, 0x6f, 0x77, 0x68, 0x65, 0x61, 0x64,
                    // 3 org
                    0x03, 0x6f, 0x72, 0x67,
                    // 0
                    0x00,
                ])
            ),
        },
        {
            name: "Encode SOA",
            test: recorder => utils.writeAndCompare(
                new rd.SOA(
                    "arrowhead.org.",
                    "mail\\.dns.arrowhead.org.",
                    1000, 3600, 30, 7200, 1800
                ),
                Buffer.from([
                    // 9 arrowhead
                    0x09, 0x61, 0x72, 0x72, 0x6f, 0x77, 0x68, 0x65, 0x61, 0x64,
                    // 3 org
                    0x03, 0x6f, 0x72, 0x67,
                    // 0
                    0x00,
                    // 8 mail.dns
                    0x08, 0x6d, 0x61, 0x69, 0x6c, 0x2e, 0x64, 0x6e, 0x73,
                    // 9 arrowhead
                    0x09, 0x61, 0x72, 0x72, 0x6f, 0x77, 0x68, 0x65, 0x61, 0x64,
                    // 3 org
                    0x03, 0x6f, 0x72, 0x67,
                    // 0
                    0x00,
                    // 1000
                    0x00, 0x00, 0x03, 0xe8,
                    // 3600
                    0x00, 0x00, 0x0e, 0x10,
                    // 30
                    0x00, 0x00, 0x00, 0x1e,
                    // 7200
                    0x00, 0x00, 0x1c, 0x20,
                    // 1800
                    0x00, 0x00, 0x07, 0x08,
                ])
            ),
        },
        {
            name: "Encode SRV",
            test: recorder => utils.writeAndCompare(
                new rd.SRV(100, 200, 300, "epsilon.arrowhead.org."),
                Buffer.from([
                    // 100
                    0x00, 0x64,
                    // 200
                    0x00, 0xc8,
                    // 300
                    0x01, 0x2c,
                    // 7 epsilon
                    0x07, 0x65, 0x70, 0x73, 0x69, 0x6c, 0x6f, 0x6e,
                    // 9 arrowhead
                    0x09, 0x61, 0x72, 0x72, 0x6f, 0x77, 0x68, 0x65, 0x61, 0x64,
                    // 3 org
                    0x03, 0x6f, 0x72, 0x67,
                    // 0
                    0x00,
                ])
            ),
        },
        {
            name: "Encode TSIG",
            test: recorder => utils.writeAndCompare(
                new rd.TSIG(
                    "hmac-sha1",
                    100, 300,
                    Buffer.from([0xfe, 0x1c]),
                    200, 0,
                    Buffer.from([0xff])
                ),
                Buffer.from([
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
                ])
            ),
        },
        {
            name: "Encode TXT",
            test: recorder => utils.writeAndCompare(
                new rd.TXT("\x03a=1\x03b=2\x00"),
                Buffer.from([
                    // 3 a=1
                    0x03, 0x61, 0x3d, 0x31,
                    // 3 b=2
                    0x03, 0x62, 0x3d, 0x32,
                    // 0
                    0x00,
                ])
            ),
        },
    ],
};