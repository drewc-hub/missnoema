import { createClient } from "npm:@supabase/supabase-js@2.49.8";
const ADULT_BUCKET = "companion-media-adult";
const DEFAULT_EXPIRES_IN = 120;
const MAX_EXPIRES_IN = 600;
Deno.serve(async (req)=>{
  try {
    if (req.method !== "POST") {
      return json({
        error: "Method not allowed"
      }, 405);
    }
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({
        error: "Missing Authorization header"
      }, 401);
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({
        error: "Missing required environment configuration"
      }, 500);
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return json({
        error: "Unauthorized"
      }, 401);
    }
    const body = await req.json();
    const bucket = body.bucket?.trim();
    const path = body.path?.trim();
    if (!bucket || !path) {
      return json({
        error: "bucket and path are required"
      }, 400);
    }
    const requestedExpires = Number.isFinite(body.expiresIn) ? Number(body.expiresIn) : DEFAULT_EXPIRES_IN;
    const expiresIn = Math.max(30, Math.min(requestedExpires, MAX_EXPIRES_IN));
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    if (bucket === ADULT_BUCKET) {
      const { data: appUser, error: appUserError } = await adminClient.from("User").select("ageVerifiedAt").eq("supabaseUserId", user.id).maybeSingle();
      if (appUserError) {
        return json({
          error: "Failed to verify age status"
        }, 500);
      }
      if (!appUser?.ageVerifiedAt) {
        return json({
          error: "Age verification required"
        }, 403);
      }
    }
    const { data, error } = await adminClient.storage.from(bucket).createSignedUrl(path, expiresIn);
    if (error || !data?.signedUrl) {
      return json({
        error: "Failed to create signed URL"
      }, 500);
    }
    return json({
      signedUrl: data.signedUrl,
      expiresIn,
      bucket,
      path
    });
  } catch (_err) {
    return json({
      error: "Invalid request"
    }, 400);
  }
});
function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}
