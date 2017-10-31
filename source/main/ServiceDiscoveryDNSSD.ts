import * as crypto from "crypto";
import * as dns from "./dns";
import * as os from "os";
import {
    ServiceDiscovery,
    ServiceType,
    ServiceIdentifier,
    ServiceRecord
} from "./ServiceDiscovery";

/**
 * Provides a `ServiceDiscovery` implementation based on the DNS-SD protocol.
 */
export class ServiceDiscoveryDNSSD implements ServiceDiscovery {
    private readonly resolver: dns.Resolver;
    private readonly transactionSigner?: dns.TransactionSigner;

    private readonly browsingDomains: () => Promise<string[]>;
    private readonly registrationDomains: () => Promise<string[]>;
    private readonly hostnames: () => Promise<string[]>;
    private readonly onErrorIgnored: (error: Error) => void;

    /**
     * Creates new DNS-SD `ServiceDiscovery` instance.
     *
     * @param configuration DNS-SD configuration.
     */
    public constructor(configuration: ServiceDiscoveryDNSSDConfiguration = {}) {
        this.resolver = new dns.Resolver({
            sockets: (configuration.nameServers || [])
                .map(address => ({ address })),
                onErrorIgnored: configuration.onErrorIgnored,
        });
        if (configuration.transactionKey) {
            if (typeof configuration.transactionKey.secret === "string") {
                configuration.transactionKey.secret = Buffer.from(
                    configuration.transactionKey.secret, "base64"
                );
            }
            this.transactionSigner = new dns.TransactionSigner(
                configuration.transactionKey.secret,
                configuration.transactionKey.name,
                configuration.transactionKey.algorithm,
                configuration.transactionKey.fudge
            );
        }

        if (configuration.browsingDomains) {
            const domains = configuration.browsingDomains.slice();
            this.browsingDomains = () => Promise.resolve(domains);
        } else {
            this.browsingDomains = () => this.hostnames()
                .then(domains => this.resolver.resolvePTRs(domains
                    .map(domain => "b._dns-sd._udp." + domain)))
                .then(results => this.removeAndLogAnyErrors(results));
        }

        if (configuration.registrationDomains) {
            const domains = configuration.registrationDomains.slice();
            this.registrationDomains = () => Promise.resolve(domains);
        } else {
            this.registrationDomains = () => this.hostnames()
                .then(domains => this.resolver.resolvePTRs(domains
                    .map(domain => "r._dns-sd._udp." + domain)))
                .then(results => this.removeAndLogAnyErrors(results));
        }

        if (configuration.hostnames) {
            const hostnames = configuration.hostnames.slice();
            this.hostnames = () => Promise.resolve(hostnames);
        } else {
            this.hostnames = () =>
                this.resolver.reverseAll(externalNetworkInterfaceAddresses())
                    .then(results => this.removeAndLogAnyErrors(results))
                    .then(names => names.reduce((hostnames, name) => {
                        const index = name.indexOf(".");
                        if (index >= 0) {
                            hostnames.push(name.substring(index + 1));
                        }
                        return hostnames;
                    }, new Array<string>()));

        }

        this.onErrorIgnored = configuration.onErrorIgnored || (error => {
            console.debug("Unhandled service discovery error: %s", error);
        });

        function externalNetworkInterfaceAddresses(): string[] {
            const nifGroups = os.networkInterfaces();
            return Object.getOwnPropertyNames(nifGroups)
                .map(nifGroupName => nifGroups[nifGroupName])
                .reduce((addresses, nifGroup) => {
                    nifGroup.forEach(nif => {
                        if (!nif.internal) {
                            addresses.push(nif.address);
                        }
                    });
                    return addresses;
                }, new Array<string>());
        }
    }

    private removeAndLogAnyErrors<T>(results: Array<T | Error>): T[] {
        return results.reduce((browsingDomains, result) => {
            if (result instanceof Error) {
                this.onErrorIgnored(result);
            } else {
                browsingDomains.push(result);
            }
            return browsingDomains;
        }, []);
    }

    public lookupTypes(): Promise<ServiceType[]> {
        return this.browsingDomains()
            .then(domains => this.resolver.resolvePTRs(domains
                .map(domain => "_services._dns-sd._udp." + domain)))
            .then(results => this.removeAndLogAnyErrors(results))
            .then(types => types.map(type => new ServiceTypeDNSSD(type)));
    }

    public lookupIdentifiers(type: ServiceType): Promise<ServiceIdentifier[]> {
        return this.resolver.resolvePTR(type.toString())
            .then(rdata => rdata.map(item => new ServiceIdentifierDNSSD(item)));
    }

    public lookupRecord(identifier: ServiceIdentifier): Promise<ServiceRecord> {
        const hostname = identifier.toString();
        return Promise.all([
            this.resolver.resolveSRV(hostname),
            this.resolver.resolveTXT(hostname)])
            .then(([srv, txt]) => new ServiceRecordDNSSD(identifier, srv, txt));
    }

    public publish(record: ServiceRecord): Promise<void> {
        return this.registrationDomains()
            .then(domains => domains.map(domain => {
                const services = "_services._dns-sd._udp." + domain;
                const type = record.serviceType + "." + domain;
                const name = record.serviceName + "." + type;

                const ttl = 60; // TODO: Configurable?
                const builder = dns.Message.newUpdateBuilder()
                    .zone(domain)
                    .absent(name)
                    .update(new dns.ResourceRecord(
                        services, dns.Type.PTR, dns.DClass.IN, ttl,
                        new dns.PTR(type)
                    ))
                    .update(new dns.ResourceRecord(
                        type, dns.Type.PTR, dns.DClass.IN, ttl,
                        new dns.PTR(name)
                    ))
                    .update(new dns.ResourceRecord(
                        name, dns.Type.SRV, dns.DClass.IN, ttl,
                        // TODO: Resolve endpoint automatically?
                        new dns.SRV(0, 0, record.port, record.endpoint || "?")
                    ));

                if (record.metadata) {
                    builder.update(new dns.ResourceRecord(
                        name, dns.Type.TXT, dns.DClass.IN, ttl,
                        dns.TXT.fromAttributes(record.metadata)
                    ));
                }

                return builder
                    .sign(this.transactionSigner)
                    .build();
            }))
            .then(updates => this.resolver.sendAll(updates))
            .then(respones => undefined);
    }

    public unpublish(identifier: ServiceIdentifier): Promise<void> {
        return this.registrationDomains()
            .then(domains => domains.map(domain => {
                const type = identifier.serviceType + "." + domain;
                const name = identifier.serviceName + "." + type;

                const updates = [
                    new dns.ResourceRecord(type, dns.Type.PTR, dns.DClass.IN,
                        0, new dns.PTR(name)),
                    new dns.ResourceRecord(name, dns.Type.ANY, dns.DClass.ANY),
                ];

                return dns.Message.newUpdateBuilder()
                    .zone(domain)
                    .present(name)
                    .update(...updates)
                    .sign(this.transactionSigner)
                    .build();
            }))
            .then(updates => this.resolver.sendAll(updates))
            .then(respones => undefined);
    }
}

/**
 * Options for creating `ServiceDiscoveryDNSSD` instances.
 */
export interface ServiceDiscoveryDNSSDConfiguration {
    /**
     * DNS-SD browsing domains.
     *
     * If not given, browsing domains will be discovered using `hostnames`.
     */
    browsingDomains?: string[];

    /**
     * DNS-SD registration domains.
     *
     * If not given, registration domains will be discovered using `hostnames`.
     */
    registrationDomains?: string[];

    /**
     * Relevant domain name server hostnames.
     *
     * If not given, DNS hostnames are resolved by doing reverse DNS lookups on
     * the addresses of any local network interfaces, and then removing the
     * least significant local hostname labels. If the local network interface
     * "eth0" has IPv4 address 192.168.0.2 and a reverse DNS lookup yields
     * "node2.example.arrowhead.eu", then "example.arrowhead.eu" will be used as
     * hostname. Note, however, that the use of VPN tunnels or other kinds of
     * virtual network interfaces may lead to some hostnames not being resolved.
     */
    hostnames?: string[];

    /**
     * Addresses to used DNS/DNS-SD servers.
     *
     * It is an error to provide domain names rather than concrete IP addresses.
     *
     * If not given, any DNS servers provided by the system will be used.
     */
    nameServers?: string[];

    /**
     * Credentials used to sign DNS UPDATE requests.
     */
    transactionKey?: {
        /**
         * Name of DNS TSIG key.
         */
        name: string,

        /**
         * Actual DNS TSIG key.
         *
         * If a `string` is provided rather than a `Buffer` it is base64 decoded
         * into a buffer.
         */
        secret: string | Buffer,

        /**
         * Name of hash algorithm used with DNS TSIG key.
         *
         * If no algorithm is specified, `HMAC-MD5.SIG-ALG.REG.INT` is used by
         * default. Other standardised alternatives include `hmac-sha1`,
         * `hmac-sha224`, `hmac-sha256`, `hmac-sha384` and `hmac-sha512`.
         */
        algorithm?: string,

        /**
         * Time error allowed when verifying signature authenticity.
         *
         * A sensible default is used if not specified.
         */
        fudge?: number,
    },

    /**
     * Function called whenever an error occurs that cannot be meaningfully
     * dealt with.
     *
     * Unhandled errors are the result of being able to recover from an error.
     * It might be of interest to log them, or handle them in some other way,
     * for which reason this callback may be provided.
     */
    onErrorIgnored?: (error: Error) => void;
}

class ServiceTypeDNSSD implements ServiceType {
    public hostname: string;
    public serviceType: string;

    constructor(data: string | ServiceType) {
        if (typeof data === "string") {
            let i = data.length - 1;
            while (data.charAt(i) === ".") {
                i--;
            }
            data = data.substring(0, i + 1);

            let divider = data.length;
            for (i = divider; i-- > 0;) {
                if (data.charAt(i) === ".") {
                    if (data.charAt(i + 1) === "_") {
                        break;
                    } else {
                        divider = i;
                    }
                }
            }
            this.hostname = data.substring(divider + 1);
            this.serviceType = data.substring(0, divider);
        } else {
            this.hostname = data.hostname;
            this.serviceType = data.serviceType;
        }
    }

    public toString(): string {
        return this.serviceType + "." + this.hostname + ".";
    }
}

class ServiceIdentifierDNSSD extends ServiceTypeDNSSD implements ServiceIdentifier {
    public serviceName: string;

    constructor(data: string | ServiceIdentifier) {
        super(data);

        if (typeof data === "string") {
            let offset = this.serviceType.indexOf(".");
            this.serviceName = this.serviceType.substring(0, offset);
            this.serviceType = this.serviceType.substring(offset + 1);
        } else {
            this.serviceName = data.serviceName;
        }
    }

    public toString(): string {
        return this.serviceName + "." + super.toString();
    }
}

class ServiceRecordDNSSD extends ServiceIdentifierDNSSD implements ServiceRecord {
    public endpoint: string;
    public port: number;
    public metadata;

    constructor(id: ServiceIdentifier, srvs: dns.SRV[], txts: dns.TXT[]) {
        super(id);

        const record = selectSRVFrom(srvs);
        this.endpoint = record.target;
        this.port = record.port;
        this.metadata = txts.reduce((attributes, txt) => {
            return Object.assign(attributes, txt.intoAttributes());
        }, {});

        function selectSRVFrom(srv: dns.SRV[]): dns.SRV {
            let minPriority = 65536, options: dns.SRV[] = [];
            srv.forEach(record => {
                if (minPriority > record.priority) {
                    minPriority = record.priority;
                    options = [record];
                } else if (record.priority === minPriority) {
                    options.push(record);
                }
            });
            let total = options.reduce((sum, option) => sum + option.weight, 0);
            const cutoff = (crypto.randomBytes(1).readUInt8(0) / 255) * total;
            return options.find(option => (total -= option.weight) <= cutoff);
        }
    }

    public toString(): string {
        const attributes: string[] = [
            "endpoint=" + this.endpoint,
            "port=" + this.port,
        ];
        Object.getOwnPropertyNames(this.metadata).forEach(key => {
            const value = this.metadata[key];
            attributes.push(key + (value ? ("=" + value) : ""));
        })
        return super.toString() + " {" + attributes.join(",") + "}";
    }
}
