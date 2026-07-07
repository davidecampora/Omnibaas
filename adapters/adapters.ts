import { AppwriteAdapter } from "./appwrite";
import type { adapter, providers } from "../types/types";

type adapters_dict = {
    [K in keyof providers]: new (config: providers[K]) => adapter;
};

export const adapters: adapters_dict = {
    appwrite: AppwriteAdapter,
};
