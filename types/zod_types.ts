import z from "zod";

const universalTypeSchema = z.enum(["string", "number", "boolean", "date"]);

const modelSchema = z.record(z.string(), universalTypeSchema);

const dbSchema = z.object({
    server_only: z.boolean(),
    models: z.record(z.string(), modelSchema),
});

export const BackedSpecSchema = z
    .object({
        dbs: z.record(z.string(), dbSchema),
        auth: z.array(z.string()),
    })
    .strict();
