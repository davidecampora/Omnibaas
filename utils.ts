import type { BackendSpec, model } from "./types/types";

type additional_data = {
    db: { DB_id: string };
    models: { DB_id: string };
    model: { DB_id: string; model_id: string };
} & { [key in keyof BackendSpec]: undefined };

type custom_result = {
    db: {
        need_update: boolean;
        server_only: boolean | undefined;
    };
};

type result = custom_result & {
    [K in Exclude<keyof additional_data, keyof custom_result>]: {
        to_remove: string[];
        to_add: string[];
        to_deep_check: string[];
    };
};

export function diffs_check<S extends keyof additional_data>(
    current: BackendSpec,
    target: BackendSpec,
    scope: S | keyof BackendSpec,
    ...args: additional_data[S] extends undefined
        ? []
        : [additional_data: additional_data[S]]
): result[S] {
    let result: any;

    switch (scope) {
        case "auth":
            result = {
                to_remove: <string[]>[],
                to_add: <string[]>[],
                to_deep_check: <string[]>[],
            };
            for (const method of new Set([...target.auth, ...current.auth])) {
                !current.auth.includes(method) && target.auth.includes(method)
                    ? result.to_add.push(method)
                    : current.auth.includes(method) &&
                      !target.auth.includes(method) &&
                      result.to_remove.push(method);
            }
            return result as result[S];
        case "dbs":
            result = {
                to_remove: <string[]>[],
                to_add: <string[]>[],
                to_deep_check: <string[]>[],
            };
            for (const DB_id of new Set([
                ...Object.keys(target.dbs),
                ...Object.keys(current.dbs),
            ])) {
                !Object.keys(current.dbs).includes(DB_id) &&
                Object.keys(target.dbs).includes(DB_id)
                    ? result.to_add.push(DB_id)
                    : Object.keys(current.dbs).includes(DB_id) &&
                        !Object.keys(target.dbs).includes(DB_id)
                      ? result.to_remove.push(DB_id)
                      : result.to_deep_check.push(DB_id);
            }
            return result as result[S];
        case "db":
            if (
                current.dbs[(args[0] as additional_data["db"]).DB_id]
                    ?.server_only !=
                target.dbs[(args[0] as additional_data["db"]).DB_id]
                    ?.server_only
            ) {
                result = {
                    need_update: true,
                    server_only:
                        target.dbs[(args[0] as additional_data["db"]).DB_id]
                            ?.server_only,
                };
            } else {
                result = {
                    need_update: false,
                };
            }

            return result as result[S];
        case "models":
            const current_models = [
                ...Object.keys(
                    current.dbs[(args[0] as additional_data["models"]).DB_id]
                        ?.models ?? [],
                ),
            ];
            const target_models = [
                ...Object.keys(
                    target.dbs[(args[0] as additional_data["models"]).DB_id]
                        ?.models ?? [],
                ),
            ];
            result = {
                to_remove: <string[]>[],
                to_add: <string[]>[],
                to_deep_check: <string[]>[],
            };
            for (const model_id of new Set([
                ...current_models,
                ...target_models,
            ])) {
                !current_models.includes(model_id) &&
                target_models.includes(model_id)
                    ? result.to_add.push(model_id)
                    : current_models.includes(model_id) &&
                        !target_models.includes(model_id)
                      ? result.to_remove.push(model_id)
                      : result.to_deep_check.push(model_id);
            }
            return result as result[S];
        case "model":
            const current_model = current.dbs[
                (args[0] as additional_data["model"]).DB_id
            ]?.models[(args[0] as additional_data["model"]).model_id] as model;
            const target_model = target.dbs[
                (args[0] as additional_data["model"]).DB_id
            ]?.models[(args[0] as additional_data["model"]).model_id] as model;
            const old_keys = [...Object.keys(current_model)];
            const new_keys = [...Object.keys(target_model)];
            result = {
                to_remove: <string[]>[],
                to_add: <string[]>[],
                to_deep_check: <string[]>[],
            };
            new Set([...old_keys, ...new_keys]).forEach((key) => {
                if (old_keys.includes(key) && !new_keys.includes(key)) {
                    result.to_remove.push(key);
                } else if (!old_keys.includes(key) && new_keys.includes(key)) {
                    result.to_add.push(key); // mantain ? required symbol bc is to add
                } else if (old_keys.includes(key) && new_keys.includes(key)) {
                    if (current_model[key] != target_model[key]) {
                        result.to_remove.push(key);
                        result.to_add.push(key);
                    }
                }
            });
            return result as result[S];
    }
}
