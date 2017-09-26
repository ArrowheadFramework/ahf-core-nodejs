import * as unit from "../unit";
import * as dns from "../../main/dns";
import * as dnsio from "../../main/dns/io";
import { } from "../../main/dns/ResourceData";

const buffer = Buffer.alloc(65535);

export const UnitResourceData: unit.Suite = {
    name: "ResourceData",
    units: [
        {
            name: "A",
            test: (recorder, writer) => {
                recorder.skip();
            },
        },
        {
            name: "AAAA",
            test: (recorder, writer) => {
                recorder.skip();
            },
        },
        {
            name: "NS",
            test: (recorder, writer) => {
                recorder.skip();
            },
        },
        {
            name: "CNAME",
            test: (recorder, writer) => {
                recorder.skip();
            },
        },
        {
            name: "SOA",
            test: (recorder, writer) => {
                recorder.skip();
            },
        },
        {
            name: "PTR",
            test: (recorder, writer) => {
                recorder.skip();
            },
        },
        {
            name: "MX",
            test: (recorder, writer) => {
                recorder.skip();
            },
        },
        {
            name: "TXT",
            test: (recorder, writer) => {
                recorder.skip();
            },
        },
        {
            name: "SRV",
            test: (recorder, writer) => {
                recorder.skip();
            },
        },
        {
            name: "TSIG",
            test: (recorder, writer) => {
                recorder.skip();
            },
        },
    ],
    before: () => [new dnsio.Writer(buffer)],
};