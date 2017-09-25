/**
 * DNS message domain classes.
 */
export enum DClass {
    /** Internet [RFC1035]. */
    IN = 1,

    /** Chaos. */
    CH = 3,

    /** Heisod. */
    HS = 4,

    /** QCLASS NONE [RFC2136]. */
    NONE = 254,

    /** QCLASS ANY [RFC1035]. */
    ANY = 255,
}

/**
 * DNS message operation codes.
 */
export enum OpCode {
    /** Query [RFC1035]. */
    QUERY = 0,

    /** Inverse query (OBSOLETE) [RFC3425]. */
    IQUERY = 1,

    /** Status [RFC1035]. */
    STATUS = 2,

    /** Notify [RFC1996]. */
    NOTIFY = 4,

    /** Update [RFC2136]. */
    UPDATE = 5,
}

/**
 * DNS message response codes.
 */
export enum RCode {
    /** No Error [RFC1035]. */
    NOERROR = 0,

    /** Format Error [RFC1035]. */
    FORMERR = 1,

    /** Server Failure [RFC1035]. */
    SERVFAIL = 2,

    /** Non-Existent Domain [RFC1035]. */
    NXDOMAIN = 3,

    /** Not Implemented [RFC1035]. */
    NOTIMP = 4,

    /** Query Refused [RFC1035]. */
    REFUSED = 5,

    /** Name Exists when it should not [RFC2136][RFC6672]. */
    YXDOMAIN = 6,

    /** RR Set Exists when it should not [RFC2136]. */
    YXRRSET = 7,

    /** RR Set that should exist does not [RFC2136]. */
    NXRRSET = 8,

    /** Server not authoritative for zone [RFC2136][RFC2845]. */
    NOTAUTH = 9,

    /** Name not contained in zone [RFC2136]. */
    NOTZONE = 10,

    /** Bad OPT Version [RFC6891]. */
    BADVERS = 16,

    /** TSIG Signature Failure [RFC2845]. */
    BADSIG = 16,

    /** Key not recognized [RFC2845]. */
    BADKEY = 17,

    /** Signature out of time window [RFC2845]. */
    BADTIME = 18,

    /** Bad TKEY Mode [RFC2930]. */
    BADMODE = 19,

    /** Duplicate key name [RFC2930]. */
    BADNAME = 20,

    /** Algorithm not supported [RFC2930]. */
    BADALG = 21,

    /** Bad Truncation [RFC4635]. */
    BADTRUNC = 22,

    /** Bad/missing Server Cookie [RFC7873]. */
    BADCOOKIE = 23,
}

/**
 * DNS resource data types.
 */
export enum Type {
    /** IPv4 address [RFC1035]. */
    A = 1,

    /** An authoritative name server [RFC1035]. */
    NS = 2,

    /** A mail destination (OBSOLETE - use MX) [RFC1035]. */
    MD = 3,

    /** A mail forwarder (OBSOLETE - use MX) [RFC1035]. */
    MF = 4,

    /** The canonical name for an alias [RFC1035]. */
    CNAME = 5,

    /** Marks the start of a zone of authority [RFC1035]. */
    SOA = 6,

    /** A mailbox domain name (EXPERIMENTAL) [RFC1035]. */
    MB = 7,

    /** A mail group member (EXPERIMENTAL) [RFC1035]. */
    MG = 8,

    /** A mail rename domain name (EXPERIMENTAL) [RFC1035]. */
    MR = 9,

    /** A null RR (EXPERIMENTAL) [RFC1035]. */
    NULL = 10,

    /** A well known service description [RFC1035]. */
    WKS = 11,

    /** A domain name pointer [RFC1035]. */
    PTR = 12,

    /** Host information [RFC1035]. */
    HINFO = 13,

    /** Mailbox or mail list information [RFC1035]. */
    MINFO = 14,

    /** Mail exchange [RFC1035]. */
    MX = 15,

    /** Text strings [RFC1035]. */
    TXT = 16,

    /** For Responsible Person [RFC1183]. */
    RP = 17,

    /** For AFS Data Base location [RFC1183][RFC5864]. */
    AFSDB = 18,

    /** For X.25 PSDN address [RFC1183]. */
    X25 = 19,

    /** For ISDN address [RFC1183]. */
    ISDN = 20,

    /** For Route Through [RFC1183]. */
    RT = 21,

    /** For NSAP address, NSAP style A record [RFC1706]. */
    NSAP = 22,

    /** For domain name pointer, NSAP style [RFC1348][RFC1637] ... */
    NSAPPTR = 23,

    /** For security signature [RFC4034][RFC3755][RFC2535][RFC2536] ... */
    SIG = 24,

    /** For security key [RFC4034][RFC3755][RFC2535][RFC2536] ... */
    KEY = 25,

    /** X.400 mail mapping information [RFC2163]. */
    PX = 26,

    /** Geographical Position [RFC1712]. */
    GPOS = 27,

    /** IPv6 Address [RFC3596]. */
    AAAA = 28,

    /** Location Information [RFC1876]. */
    LOC = 29,

    /** Next Domain (OBSOLETE) [RFC3755][RFC2535]. */
    NXT = 30,

    /** Endpoint Identifier. */
    EID = 31,

    /** Nimrod Locator. */
    NIMLOC = 32,

    /** Server selection [RFC2782]. */
    SRV = 33,

    /** ATM Address. */
    ATMA = 34,

    /** Naming Authority Pointer [RFC2915][RFC2168][RFC3403]. */
    NAPTR = 35,

    /** Key Exchanger [RFC2230]. */
    KX = 36,

    /** Certificate [RFC4398]. */
    CERT = 37,

    /** A6 (OBSOLETE - use AAAA) [RFC3226][RFC2874][RFC6563]. */
    A6 = 38,

    /** DNAME [RFC6672]. */
    DNAME = 39,

    /** SINK. */
    SINK = 40,

    /** OPT [RFC6891][RFC3225]. */
    OPT = 41,

    /** APL [RFC3123]. */
    APL = 42,

    /** Delegation signer [RFC4034][RFC3658]. */
    DS = 43,

    /** SSH key fingerprint [RFC4255]. */
    SSHFP = 44,

    /** IPSECKEY [RFC4025]. */
    IPSECKEY = 45,

    /** RRSIG [RFC4034][RFC3755]. */
    RRSIG = 46,

    /** NSEC [RFC4034][RFC3755]. */
    NSEC = 47,

    /** DNSKEY [RFC4034][RFC3755]. */
    DNSKEY = 48,

    /** DHCID [RFC4701]. */
    DHCID = 49,

    /** NSEC3 [RFC5155]. */
    NSEC3 = 50,

    /** NSEC3PARAM [RFC5155]. */
    NSEC3PARAM = 51,

    /** TLSA [RFC6698]. */
    TLSA = 52,

    /** S/MIME cert association [RFC8162]. */
    SMIMEA = 53,

    /** Host Identity Protocol [RFC8005]. */
    HIP = 55,

    /** NINFO. */
    NINFO = 56,

    /** RKEY. */
    RKEY = 57,

    /** Trust Anchor LINK. */
    TALINK = 58,

    /** Child DS [RFC7344]. */
    CDS = 59,

    /** DNSKEY(s) the Child wants reflected in DS [RFC7344]. */
    CDNSKEY = 60,

    /** OpenPGP Key [RFC7929]. */
    OPENPGPKEY = 61,

    /** Child-to-parent SYNChronization [RFC7477]. */
    CSYNC = 62,

    /** [RFC7208]. */
    SPF = 99,

    /** [IANA-Reserved]. */
    UINFO = 100,

    /** [IANA-Reserved]. */
    UID = 101,

    /** [IANA-Reserved]. */
    GID = 102,

    /** [IANA-Reserved]. */
    UNSPEC = 103,

    /** [RFC6742]. */
    NID = 104,

    /** [RFC6742]. */
    L32 = 105,

    /** [RFC6742]. */
    L64 = 106,

    /** [RFC6742]. */
    LP = 107,

    /** An EUI-48 address [RFC7043]. */
    EUI48 = 108,

    /** An EUI-64 address [RFC7043]. */
    EUI64 = 109,

    /** Transaction Key [RFC2930]. */
    TKEY = 249,

    /** Transaction Signature [RFC2845]. */
    TSIG = 250,

    /** Incremental transfer [RFC1995]. */
    IXFR = 251,

    /** Transfer of an entire zone [RFC1035][RFC5936]. */
    AXFR = 252,

    /** Mailbox-related RRs (MB, MG or MR) [RFC1035]. */
    MAILB = 253,

    /** Mail agent RRs (OBSOLETE - see MX) [RFC1035]. */
    MAILA = 254,

    /** A request for all records available [RFC1035][RFC6895]. */
    ANY = 255,

    /** URI [RFC7553]. */
    URI = 256,

    /** Certification Authority Restriction [RFC6844]. */
    CAA = 257,

    /** Application Visibility and Control. */
    AVC = 258,

    /** Digital Object Architecture. */
    DOA = 259,

    /** DNSSEC Trust Authorities. */
    TA = 32768,

    /** DNSSEC Lookaside Validation [RFC4431]. */
    DLV = 32769,
}