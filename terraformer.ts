import z from "zod";
import { adapters } from "./adapters/adapters.ts";
import type {
    adapter,
    BackendSpec,
    model,
    providers,
    universal_type,
} from "./types/types.ts";
import { BackedSpecSchema } from "./types/zod_types.ts";
import { diffs_check } from "./utils.ts";

export class Terraformer<P extends keyof providers> {
    private provider: adapter;
    constructor(provider: P, config: providers[P]) {
        this.provider = new adapters[provider](config);
    }

    validate(spec: BackendSpec) {
        const result = BackedSpecSchema.safeParse(spec);

        if (!result.success) {
            return z.treeifyError(result.error); // check return.success
        } else {
            return true;
        }
    }

    async introspect(): Promise<BackendSpec> {
        let current_state: BackendSpec = {
            auth: (await this.provider.getAuthMethods()).map(
                (method) => method.$id,
            ),
            dbs: {},
        };

        let dbs: string[];

        try {
            dbs = await this.provider.listDBs();
        } catch (e) {
            dbs = [];
        }
        for (const DB_id of dbs) {
            const enabled = (await this.provider.getDB(DB_id)).server_only;
            let tables: Record<string, model> = {};
            try {
                (await this.provider.listTables(DB_id)).forEach((table) => {
                    tables[table.id] = table.model;
                });
            } catch (e) {
                tables = {};
            }
            current_state.dbs[DB_id] = {
                server_only: enabled,
                models: tables,
            };
        }

        const result = BackedSpecSchema.safeParse(current_state);

        if (result.success) {
            return current_state as BackendSpec;
        } else {
            console.warn(result);
            throw new Error("Error during the introspection:");
        }
    }

    plan(
        current: BackendSpec,
        target: BackendSpec,
    ): { readable_ops: string[]; ops: (() => Promise<any>)[] } {
        const operation_plan: (() => Promise<any>)[] = [];
        const description_messages = [];
        // auth methods check
        const auth_check = diffs_check(current, target, "auth");
        auth_check.to_remove.length > 0 &&
            description_messages.push(
                `Following auth methods will be disabled: ${auth_check.to_remove.join(", ")}`,
            );
        auth_check.to_add.length > 0 &&
            description_messages.push(
                `Following auth methods will be enabled: ${auth_check.to_add.join(", ")}`,
            );
        auth_check.to_remove.forEach((method) =>
            operation_plan.push(
                async () => await this.provider.setAuthMethod(method, false),
            ),
        );
        auth_check.to_add.forEach((method) =>
            operation_plan.push(
                async () => await this.provider.setAuthMethod(method, true),
            ),
        );

        //check checkDBs
        const dbs_check = diffs_check(current, target, "dbs");
        dbs_check.to_remove.length > 0 &&
            description_messages.push(
                `Following dbs will be deleted: ${dbs_check.to_remove.join(", ")}`,
            );

        dbs_check.to_add.length > 0 &&
            description_messages.push(
                `Following dbs will be created: ${dbs_check.to_add.join(", ")}`,
            );
        dbs_check.to_remove.forEach((DB_id) =>
            operation_plan.push(
                async () => await this.provider.deleteDB(DB_id),
            ),
        );
        dbs_check.to_add.forEach((DB_id) =>
            operation_plan.push(
                async () =>
                    await this.provider.createDB(
                        DB_id,
                        target.dbs[DB_id]?.server_only ?? true,
                    ),
            ),
        );

        //check server_onlu for ids that persisted
        dbs_check.to_deep_check.forEach((DB_id) => {
            const single_db_check = diffs_check(current, target, "db", {
                DB_id: DB_id,
            });
            if (single_db_check.need_update) {
                description_messages.push(
                    `Following db will be toggled ${single_db_check.server_only ? "on" : "off"}: ${DB_id}`,
                );
                operation_plan.push(
                    async () =>
                        await this.provider.updateDB(
                            DB_id,
                            single_db_check.server_only as boolean,
                        ),
                );
            }
        });

        //models check for that specic DB_id
        new Set([...dbs_check.to_add, ...dbs_check.to_deep_check]).forEach(
            (DB_id) => {
                const models_check = diffs_check(current, target, "models", {
                    DB_id: DB_id,
                });
                models_check.to_remove.length > 0 &&
                    description_messages.push(
                        `Models ${models_check.to_remove.join(", ")} of ${DB_id} DB will be deleted`,
                    );
                models_check.to_add.length > 0 &&
                    description_messages.push(
                        `Models ${models_check.to_add.join(", ")} of ${DB_id} DB will be created`,
                    );
                models_check.to_remove.forEach((model_name) =>
                    operation_plan.push(
                        async () =>
                            await this.provider.deleteTable(DB_id, model_name),
                    ),
                );
                models_check.to_add.forEach((model_name) =>
                    operation_plan.push(
                        async () =>
                            await this.provider.createTable(
                                DB_id,
                                model_name,
                                target.dbs[DB_id]?.models[model_name] ?? {},
                            ),
                    ),
                );

                //check single model
                models_check.to_deep_check.forEach((model_name) => {
                    const model_check = diffs_check(current, target, "model", {
                        DB_id: DB_id,
                        model_id: model_name,
                    });
                    model_check.to_remove.length > 0 &&
                        description_messages.push(
                            `Keys ${model_check.to_remove.join(", ")} will be removed from ${model_name} model of ${DB_id} DB`,
                        );
                    model_check.to_add.length > 0 &&
                        description_messages.push(
                            `Keys ${model_check.to_add.join(", ")} will be added to ${model_name} model of ${DB_id} DB`,
                        );
                    model_check.to_remove.forEach((key) =>
                        operation_plan.push(
                            async () =>
                                await this.provider.deleteColumn(
                                    DB_id,
                                    model_name,
                                    key,
                                ),
                        ),
                    );
                    model_check.to_add.forEach((key) =>
                        operation_plan.push(
                            async () =>
                                await this.provider.createColumn(
                                    DB_id,
                                    model_name,
                                    key,
                                    target.dbs[DB_id]?.models[model_name]?.[
                                        key
                                    ] as universal_type,
                                ),
                        ),
                    );
                });
            },
        );

        return {
            readable_ops: description_messages,
            ops: operation_plan,
        };
    }

    async apply(ops: (() => Promise<any>)[]): Promise<void> {
        for await (let operation of ops) {
            try {
                void (await operation());
            } catch (e1) {
                // error could be caused by a server's delay
                console.warn("error during an operation, try again in 1000ms");
                await new Promise((resolve, reject) => {
                    setTimeout(resolve, 1000);
                });
                try {
                    await operation();
                } catch (e2) {
                    throw new Error(
                        "An error occurred during the execution of an operation",
                    );
                }
            }
        }
        console.log("All changes have been applied successfully!");
    }
}
