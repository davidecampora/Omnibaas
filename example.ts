import { Terraformer } from "./terraformer.ts";
import type { BackendSpec } from "./types/types.ts";

// create your Terraform instance, choose your provider and fill arguments with the required info
const terraform = new Terraformer("appwrite", {
    project_ID: process.env.APPWRITE_PROJECT_ID!,
    API_key: process.env.APPWRITE_API_KEY!,
});

//get current configuration from the provider
const current_spec = await terraform.introspect();

const target_spec = Bun.YAML.parse(
    await Bun.file("./backend.yaml").text(),
) as BackendSpec;

//vcalidate target spec
if (terraform.validate(target_spec)) {
    //get implementation plan and its description
    const { readable_ops, ops } = terraform.plan(current_spec, target_spec);

    console.log(readable_ops.join("\n"));

    //apply changes
    await terraform.apply(ops);
}
