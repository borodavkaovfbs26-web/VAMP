import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok",{headers:cors});
  try {
    const url=Deno.env.get("SUPABASE_URL")!;
    const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anon=Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth=req.headers.get("Authorization")||"";
    const caller=createClient(url,anon,{global:{headers:{Authorization:auth}}});
    const {data:{user:actor},error:authError}=await caller.auth.getUser();
    if(authError||!actor) throw new Error("Потрібна авторизація");
    const {data:admin}=await caller.from("profiles").select("role").eq("id",actor.id).single();
    if(admin?.role!=="admin") throw new Error("Лише адміністратор може створювати акаунти");
    const body=await req.json();
    const name=String(body.name||"").trim(),email=String(body.email||"").trim().toLowerCase(),password=String(body.password||"");
    const role=String(body.role||"student"),age=body.age?Number(body.age):null,level=String(body.level||"A1");
    if(!name||!email||password.length<8||!["student","teacher","admin"].includes(role)) throw new Error("Перевір ім'я, email, пароль (мінімум 8 символів) і роль");
    const root=createClient(url,service);
    const {data,error}=await root.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:name}});
    if(error) throw error;
    const {error:profileError}=await root.from("profiles").insert({id:data.user.id,full_name:name,role,age,level});
    if(profileError){await root.auth.admin.deleteUser(data.user.id);throw profileError}
    return new Response(JSON.stringify({ok:true,user_id:data.user.id}),{headers:{...cors,"Content-Type":"application/json"}});
  } catch(e) {
    return new Response(JSON.stringify({error:e.message||"Помилка створення акаунта"}),{status:400,headers:{...cors,"Content-Type":"application/json"}});
  }
});