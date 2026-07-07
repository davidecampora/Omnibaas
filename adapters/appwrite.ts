import axios, { create } from "axios";
import type { model, providers } from "../types/types.ts";
import type {
    conversion_table,
    universal_type,
    reversed_conversion_table,
    adapter,
    auth_method,
    db,
} from "../types/types.ts";

const auth_methods = [
    "email-password",
    "magic-url",
    "email-otp",
    "anonymous",
    "invites",
    "jwt",
    "phone",
];

const types: conversion_table = {
    string: "string",
    number: "double",
    boolean: "boolean",
    date: "datetime",
};

const reversed_types: reversed_conversion_table = {
    string: "string",
    float: "number",
    double: "number",
    integer: "number",
    boolean: "boolean",
    datetime: "date",
};

export class AppwriteAdapter implements adapter {
    project_ID: string;
    API_key: string;
    private request_headers;

    constructor(config: providers["appwrite"]) {
        this.project_ID = config.project_ID;
        this.API_key = config.API_key;
        // Configuration parser

        this.request_headers = {
            "Content-Type": "application/json",
            "X-Appwrite-Response-Format": "1.9.5",
            "X-Appwrite-Project": this.project_ID,
            "X-Appwrite-Key": this.API_key,
        };
    }

    async setAuthMethod(method: string, enabled: boolean): Promise<void> {
        try {
            await axios.request({
                method: "PATCH",
                url: `https://cloud.appwrite.io/v1/project/auth-methods/${method}`,
                headers: this.request_headers,
                data: {
                    enabled: enabled,
                },
            });
        } catch (e) {
            throw new Error("Method do not exist");
        }
    } // does not work properly, probably appwrite API is bugged

    async getAuthMethods(): Promise<[auth_method, ...auth_method[]]> {
        const project = await axios.request({
            method: "GET",
            url: `https://cloud.appwrite.io/v1/project`,
            headers: this.request_headers,
        });
        if (project.data.authMethods.length > 0) {
            return project.data.authMethods;
        } else {
            throw new Error("No auth methods");
        }
    }

    async listDBs(): Promise<[string, ...string[]]> {
        const result = await axios.request({
            method: "GET",
            url: `https://cloud.appwrite.io/v1/tablesdb`,
            headers: this.request_headers,
        });
        if (result.data.total != 0) {
            return result.data.databases.map((db: any) => db.$id);
        } else {
            throw new Error("No dbs");
        }
    }

    async createDB(DB_id: string, server_only: boolean): Promise<void> {
        await axios.request({
            method: "POST",
            url: `https://cloud.appwrite.io/v1/tablesdb`,
            headers: this.request_headers,
            data: {
                databaseId: DB_id,
                name: DB_id,
                enabled: server_only,
            },
        });
    }

    async getDB(DB_id: string): Promise<db> {
        try {
            const result = await axios.request({
                method: "GET",
                url: `https://cloud.appwrite.io/v1/tablesdb/${DB_id}`,
                headers: this.request_headers,
            });

            return {
                id: result.data.$id,
                name: result.data.name,
                server_only: result.data.enabled,
            };
        } catch (e) {
            throw new Error(`No db:${DB_id}`);
        }
    }

    async updateDB(DB_id: string, server_only: boolean): Promise<void> {
        try {
            await axios.request({
                method: "PUT",
                url: `https://cloud.appwrite.io/v1/tablesdb/${DB_id}`,
                headers: this.request_headers,
                data: {
                    enabeld: server_only,
                },
            });
        } catch (e) {
            throw new Error("Db do not exist");
        }
    }

    async deleteDB(DB_id: string): Promise<void> {
        try {
            await axios.request({
                method: "DELETE",
                url: `https://cloud.appwrite.io/v1/tablesdb/${DB_id}`,
                headers: this.request_headers,
            });
        } catch (e) {
            throw new Error("Db do not exist");
        }
    }

    async listTables(
        DB_id: string,
    ): Promise<
        [{ id: string; model: model }, ...{ id: string; model: model }[]]
    > {
        const result = await axios.request({
            method: "GET",
            url: `https://cloud.appwrite.io/v1/tablesdb/${DB_id}/tables`,
            headers: this.request_headers,
        });

        if (result.data.total != 0) {
            return result.data.tables.map((table: any) => {
                return {
                    id: table.$id,
                    model: table.columns.reduce((acc: any, col: any) => {
                        acc[col.key + (col.required ? "" : "?")] =
                            reversed_types[col.type];
                        return acc;
                    }, {}),
                };
            });
        } else {
            throw new Error("No tables");
        }
    }

    async createTable(
        DB_id: string,
        model_id: string,
        model: model,
    ): Promise<void> {
        try {
            await axios.request({
                method: "POST",
                url: `https://cloud.appwrite.io/v1/tablesdb/${DB_id}/tables`,
                headers: this.request_headers,
                data: {
                    tableId: model_id,
                    name: model_id,
                    columns: Object.keys(model).map((column_key) => {
                        return {
                            key: column_key.replace("?", ""),
                            type: types[model[column_key] as universal_type],
                            size:
                                model[column_key] != "string" ? undefined : 128,
                            required:
                                column_key.slice(-1) == "?" ? false : true,
                        };
                    }),
                },
            });
        } catch (e) {
            console.log(e);
        }
    }

    async getTable(
        DB_id: string,
        table_id: string,
    ): Promise<{ id: string; model: model }> {
        try {
            const result = await axios.request({
                method: "GET",
                url: `https://cloud.appwrite.io/v1/tablesdb/${DB_id}/tables/${table_id}`,
                headers: this.request_headers,
            });
            return {
                id: result.data.$id,
                model: result.data.columns.reduce((acc: any, col: any) => {
                    acc[col.key + (col.required ? "" : "?")] =
                        reversed_types[col.type];
                    return acc;
                }, {}),
            };
        } catch (e) {
            throw new Error("No table");
        }
    }

    async createColumn(
        DB_id: string,
        table_id: string,
        key: string,
        type: universal_type,
    ): Promise<void> {
        try {
            await axios.request({
                method: "POST",
                url: `https://cloud.appwrite.io/v1/tablesdb/${DB_id}/tables/${table_id}/columns/${types[type]}`,
                headers: this.request_headers,
                data: {
                    key: key.replace("?", ""),
                    type: types[type],
                    size: 128,
                    required: key.slice(-1) == "?" ? false : true,
                },
            });
        } catch (e) {
            throw new Error("Table not found");
        }
    }

    async deleteColumn(
        DB_id: string,
        table_id: string,
        key: string,
    ): Promise<void> {
        try {
            await axios.request({
                method: "DELETE",
                url: `https://cloud.appwrite.io/v1/tablesdb/${DB_id}/tables/${table_id}/columns/${key.replace("?", "")}`,
                headers: this.request_headers,
            });
        } catch (e) {
            throw new Error("Column not found");
        }
    }

    async updateTable(
        DB_id: string,
        table_id: string,
        new_model: model,
    ): Promise<void> {
        //check diff
        try {
            const current_state = (await this.getTable(DB_id, table_id)).model;
            const to_delete: string[] = [];
            const to_add: string[] = [];
            [...Object.keys(current_state), ...Object.keys(new_model)].forEach(
                (key) => {
                    const parsed_key = key.replace("?", "");
                    const old_keys = Object.keys(current_state).map((key) =>
                        key.replace("?", ""),
                    );
                    const new_keys = Object.keys(new_model).map((key) =>
                        key.replace("?", ""),
                    );
                    if (old_keys.includes(key) && !new_keys.includes(key)) {
                        to_delete.push(parsed_key);
                    } else if (
                        !old_keys.includes(key) &&
                        new_keys.includes(key)
                    ) {
                        to_add.push(key); // mantain ? required symbol bc is to add
                    } else if (
                        old_keys.includes(key) &&
                        new_keys.includes(key)
                    ) {
                        if (current_state[key] != new_model[key]) {
                            to_delete.push(parsed_key);
                            to_add.push(key);
                        }
                    }
                },
            );
            if (to_delete.length == 0 && to_add.length == 0) {
                return;
            }

            // always to_delete first
            to_delete.forEach(async (key) => {
                try {
                    await axios.request({
                        method: "DELETE",
                        url: `https://cloud.appwrite.io/v1/tablesdb/${DB_id}/tables/${table_id}/columns/${key}`,
                        headers: this.request_headers,
                    });
                } catch (e) {
                    throw new Error("No column found with this key");
                }
            });

            to_add.forEach(async (key) => {
                try {
                    await axios.request({
                        method: "POST",
                        url: `https://cloud.appwrite.io/v1/tablesdb/${DB_id}/tables/${table_id}/columns/${types[new_model[key] as universal_type]}`,
                        headers: this.request_headers,
                        data: {
                            key: key.replace("?", ""),
                            type: types[new_model[key] as universal_type],
                            size: 128,
                            required: key.slice(-1) == "?" ? false : true,
                        },
                    });
                } catch (e) {
                    throw new Error("Table not found");
                }
            });
        } catch (e) {
            throw new Error("Error in retrieving diffs");
        }
    }

    async deleteTable(DB_id: string, table_id: string): Promise<void> {
        try {
            await axios.request({
                method: "DELETE",
                url: `https://cloud.appwrite.io/v1/tablesdb/${DB_id}/tables/${table_id}`,
                headers: this.request_headers,
            });
        } catch (e) {
            throw new Error("Table do not exist");
        }
    }
}

// async migrate(configuration: configuration_file) {
//     auth_methods.forEach(async (method) => {
//         await this.setAuthMethod(
//             method,
//             configuration.auth.includes(method),
//         );
//     });

//     // DATA  structures
//     Object.keys(configuration.dbs).forEach(async (DB_id) => {
//         //create db
//         await this.createDB(
//             DB_id,
//             configuration.dbs[DB_id]?.server_only as boolean,
//         );
//         // create tables
//         Object.keys(configuration.dbs[DB_id]?.models ?? []).forEach(
//             async (model_id) =>
//                 await this.createTable(
//                     DB_id,
//                     model_id,
//                     configuration.dbs[DB_id]?.models[model_id] as model,
//                 ),
//         );
//     });
// }
