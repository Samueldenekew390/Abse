// 1. Create a Supabase project. Paste the Project URL and anon/public key below.
// Never put a service_role key in browser code.
const SUPABASE_URL = "https://awlezbujhxwsnqdxdsoi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_wTKcnym1pgb72V2-Kjn1zg_gbiKINFo";
const configured = SUPABASE_URL.startsWith("https://") && !SUPABASE_ANON_KEY.startsWith("PASTE_");
const db = configured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const $ = (id) => document.getElementById(id);
let activeFilter = "all";
let cachedApplicants = [];
let currentUser = null;
const fallbackAvatar = (name="Applicant") => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f4e1e5&color=9f1028&bold=true&size=120`;
function toast(message){const el=$("toast");el.textContent=message;el.style.display="block";setTimeout(()=>el.style.display="none",3200)}
function setMessage(id,msg){$(id).textContent=msg}
function safeText(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function statusLabel(s){return s==="accepted"?"Accepted":s==="rejected"?"Rejected":"Pending"}
function photoUrl(path){if(!path)return "";return db.storage.from("applicant-photos").getPublicUrl(path).data.publicUrl}
function renderApplicants(){
  const sorted=[...cachedApplicants].sort((a,b)=>({accepted:0,pending:1,rejected:2}[a.status]-({accepted:0,pending:1,rejected:2}[b.status])) || a.name.localeCompare(b.name));
  const counts={all:sorted.length,accepted:0,pending:0,rejected:0};sorted.forEach(a=>counts[a.status]++);
  Object.keys(counts).forEach(k=>$("count-"+k).textContent=counts[k]);
  const visible=activeFilter==="all"?sorted:sorted.filter(a=>a.status===activeFilter);
  $("applicant-list").innerHTML=visible.length?visible.map(a=>{
    const img=photoUrl(a.photo_path)||fallbackAvatar(a.name);
    const detail=a.status==="accepted"?`<button class="details-arrow" aria-label="View ${safeText(a.name)} details" data-details="${safeText(a.id)}">›</button>`:"";
    return `<article class="applicant"><img class="avatar" src="${img}" alt="Photo of ${safeText(a.name)}" onerror="this.src='${fallbackAvatar(a.name)}'"><div class="applicant-info"><strong>${safeText(a.name)}</strong><small>${safeText(a.location||"Canada")}</small></div><span class="status ${a.status}">${statusLabel(a.status)}</span>${detail}</article>`;
  }).join(""):'<div class="empty-state">No applicants in this category yet.</div>';
  document.querySelectorAll("[data-details]").forEach(btn=>btn.addEventListener("click",()=>showApplicantDetails(btn.dataset.details)));
}
function showApplicantDetails(id){
  const a=cachedApplicants.find(x=>x.id===id);if(!a)return;
  // The public view only returns optional details when the admin explicitly enables them.
  const lines=[];
  if(a.public_age!==null&&a.public_age!==undefined)lines.push(`Age: ${a.public_age}`);
  if(a.public_phone)lines.push(`Phone: ${a.public_phone}`);
  lines.push(`Passport: ${a.public_passport_status||"On process"}`,`Location: ${a.location||"Canada"}`);
  alert(`${a.name}\n${lines.join("\n")}`);
}
async function loadPublic(){
  if(!db)return;
  const {data,error}=await db.from("public_applicants").select("*");
  if(error){console.error(error);$("applicant-list").innerHTML='<div class="empty-state">Applicant information is temporarily unavailable.</div>';return}
  cachedApplicants=data||[];renderApplicants();
}
async function checkAdmin(){
  if(!db)return;
  const {data:{session}}=await db.auth.getSession();
  currentUser=session?.user||null;
  await updateAdminUI();
  if(currentUser)await loadAdminRecords();
}
async function isAdmin(){
  if(!currentUser)return false;
  const {data,error}=await db.from("admin_users").select("user_id").eq("user_id",currentUser.id).maybeSingle();
  return !error&&!!data;
}
async function updateAdminUI(){
  if(!db){$("setup-warning").classList.remove("hidden");return}
  $("setup-warning").classList.add("hidden");
  const admin=currentUser&&await isAdmin();
  $("login-panel").classList.toggle("hidden",!!admin);
  $("dashboard").classList.toggle("hidden",!admin);
  if(admin)$("admin-email").textContent=currentUser.email||"Signed in";
}
async function loadAdminRecords(){
  const admin=await isAdmin();if(!admin)return;
  const {data,error}=await db.from("applicants").select("*").order("created_at",{ascending:false});
  if(error){toast("Could not load records: "+error.message);return}
  $("admin-records").innerHTML=(data||[]).map(a=>`<div class="admin-record"><img class="avatar" src="${photoUrl(a.photo_path)||fallbackAvatar(a.name)}" alt=""><strong>${safeText(a.name)} · ${statusLabel(a.status)} ${a.is_published?"":"(hidden)"}</strong><button class="outline-btn" data-edit="${a.id}">Edit</button><button class="outline-btn" data-delete="${a.id}">Delete</button></div>`).join("")||'<p class="muted">No records yet.</p>';
  document.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>editApplicant(b.dataset.edit,data)));
  document.querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>deleteApplicant(b.dataset.delete)));
}
function resetForm(){
  $("applicant-form").reset();$("edit-id").value="";$("app-location").value="Canada";$("app-passport").value="On process";$("is-published").checked=true;$("save-btn").textContent="Add applicant +";$("cancel-edit").classList.add("hidden");
}
function editApplicant(id,records){
  const a=records.find(x=>x.id===id);if(!a)return;
  $("edit-id").value=a.id;$("app-name").value=a.name;$("app-status").value=a.status;$("app-age").value=a.age??"";$("app-phone").value=a.phone??"";$("app-passport").value=a.passport_status||"On process";$("app-location").value=a.location||"Canada";$("show-age").checked=!!a.show_age;$("show-phone").checked=!!a.show_phone;$("show-passport").checked=!!a.show_passport_status;$("is-published").checked=!!a.is_published;$("save-btn").textContent="Save changes";$("cancel-edit").classList.remove("hidden");$("applicant-form").scrollIntoView({behavior:"smooth",block:"center"});
}
async function deleteApplicant(id){
  if(!confirm("Delete this applicant record? This cannot be undone."))return;
  const {error}=await db.from("applicants").delete().eq("id",id);
  if(error){toast("Delete failed: "+error.message);return}
  toast("Applicant deleted.");await loadAdminRecords();await loadPublic();
}
$("login-form").addEventListener("submit",async e=>{
  e.preventDefault();if(!db)return setMessage("login-message","Add your Supabase settings first.");
  setMessage("login-message","Signing in…");
  const {data,error}=await db.auth.signInWithPassword({email:$("login-email").value.trim(),password:$("login-password").value});
  if(error){setMessage("login-message",error.message);return}
  currentUser=data.user;await updateAdminUI();
  if(!(await isAdmin())){await db.auth.signOut();currentUser=null;await updateAdminUI();setMessage("login-message","This account is not authorized as an administrator.");return}
  setMessage("login-message","");await loadAdminRecords();toast("Signed in.");
});
$("logout-btn").addEventListener("click",async()=>{await db.auth.signOut();currentUser=null;await updateAdminUI();toast("Signed out.")});
$("cancel-edit").addEventListener("click",resetForm);
$("applicant-form").addEventListener("submit",async e=>{
  e.preventDefault();if(!await isAdmin())return toast("Administrator access required.");
  const id=$("edit-id").value;let photo_path=null;const file=$("app-photo").files[0];
  if(file){
    if(file.size>5*1024*1024)return setMessage("save-message","Photo must be 5 MB or smaller.");
    if(!["image/jpeg","image/png","image/webp"].includes(file.type))return setMessage("save-message","Use JPG, PNG or WEBP.");
    const path=`${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
    const {error:uploadError}=await db.storage.from("applicant-photos").upload(path,file,{upsert:false,contentType:file.type});
    if(uploadError)return setMessage("save-message","Photo upload failed: "+uploadError.message);
    photo_path=path;
  }
  const payload={name:$("app-name").value.trim(),status:$("app-status").value,age:$("app-age").value?Number($("app-age").value):null,phone:$("app-phone").value.trim()||null,passport_status:$("app-passport").value,location:$("app-location").value.trim()||"Canada",show_age:$("show-age").checked,show_phone:$("show-phone").checked,show_passport_status:$("show-passport").checked,is_published:$("is-published").checked};
  if(photo_path)payload.photo_path=photo_path;
  const result=id?await db.from("applicants").update(payload).eq("id",id):await db.from("applicants").insert(payload);
  if(result.error){setMessage("save-message",result.error.message);return}
  setMessage("save-message","Saved successfully.");resetForm();await loadAdminRecords();await loadPublic();toast("Applicant saved.");
});
$("password-form").addEventListener("submit",async e=>{
  e.preventDefault();if(!await isAdmin())return;
  const password=$("new-password").value;
  const {error}=await db.auth.updateUser({password});
  setMessage("password-message",error?error.message:"Password updated successfully.");if(!error)$("password-form").reset();
});
document.querySelectorAll(".status-tab").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".status-tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");activeFilter=b.dataset.filter;renderApplicants()}));
$("year").textContent=new Date().getFullYear();
if(db){
  db.auth.onAuthStateChange((_event,session)=>{currentUser=session?.user||null;setTimeout(async()=>{await updateAdminUI();if(currentUser)await loadAdminRecords()},0)});
  loadPublic();checkAdmin();
}else{
  cachedApplicants=[
    {id:"demo1",name:"Sample Applicant One",status:"accepted",location:"Canada"},
    {id:"demo2",name:"Sample Applicant Two",status:"pending",location:"Canada"},
    {id:"demo3",name:"Sample Applicant Three",status:"rejected",location:"Canada"}
  ];
  renderApplicants();
}
