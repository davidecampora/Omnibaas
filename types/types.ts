export type universal_type = "string" | "number" | "boolean" | "date";

export type BackendSpec = {
    dbs: {
        [key in string]: {
            server_only: boolean;
            models: {
                [key in string]: model;
            };
        };
    };
    auth: string[];
};

export type providers = {
    appwrite: { project_ID: string; API_key: string };
};

export type conversion_table = {
    [key in universal_type]: string;
};

export type reversed_conversion_table = {
    [key in string]: universal_type;
};

export type db = {
    id: string;
    name: string;
    server_only: boolean;
};

export type auth_method = {
    $id: string;
    enabled: boolean;
};

export type model = {
    [key in string]: universal_type;
};

export interface adapter {
    setAuthMethod(method: string, enabled: boolean): Promise<void>;
    getAuthMethods(): Promise<[auth_method, ...auth_method[]]>;
    listDBs(): Promise<[string, ...string[]]>;
    createDB(DB_id: string, server_only: boolean): Promise<void>;
    getDB(DB_id: string): Promise<db>;
    updateDB(DB_id: string, server_only: boolean): Promise<void>;
    deleteDB(DB_id: string): Promise<void>;
    listTables(
        DB_id: string,
    ): Promise<
        [{ id: string; model: model }, ...{ id: string; model: model }[]]
    >;
    createTable(DB_id: string, model_id: string, model: model): Promise<void>;
    getTable(
        DB_id: string,
        table_id: string,
    ): Promise<{ id: string; model: model }>;
    createColumn(
        DB_id: string,
        table_id: string,
        key: string,
        type: universal_type,
    ): Promise<void>;
    deleteColumn(DB_id: string, table_id: string, key: string): Promise<void>;
    deleteTable(DB_id: string, table_id: string): Promise<void>;
}
