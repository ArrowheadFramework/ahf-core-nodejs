/**
 * Base interface for all kinds of service queries.
 */
export interface Query {
    /**
     * Record offset.
     *
     * Causes the given number of records to be skipped before search begins.
     */
    offset?: number;

    /**
     * Record limit.
     *
     * Causes search to stop after given number of matching records have been
     * found.
     */
    limit?: number
}

/**
 * Base interface for all kinds of service query results.
 */
export interface QueryResults<T> extends Query {
    /**
     * Actual record offset.
     */
    offset?: number;

    /**
     * Actual record limit.
     */
    limit?: number;

    /**
     * Records matching corresponding `Query`.
     */
    matches: T[];
}