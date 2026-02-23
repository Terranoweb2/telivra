import { handlers } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";

export const dynamic = "force-dynamic";

const { GET: authGET, POST: authPOST } = handlers;
export const GET = withTenant(authGET);
export const POST = withTenant(authPOST);
