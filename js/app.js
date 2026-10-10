
(function(){
var $=function(id){return document.getElementById(id)};
var KEY="procurement_plan_v1",META="procurement_plan_meta_v1",TXK="procurement_tx_v1",YK="procurement_years_v1",CY="procurement_year_cur_v1",OBJKEY="procurement_objs_v1",ALK="procurement_alloc_v1",ANK="procurement_annual_v1";
function load(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}}
/* ---------- Firebase (cloud backup + sync) ---------- */
var firebaseConfig=window.FIREBASE_CONFIG;
var CLOUD_KEYS=["procurement_plan_v1","procurement_plan_meta_v1","procurement_tx_v1","procurement_years_v1","procurement_objs_v1","procurement_alloc_v1","procurement_annual_v1"],DIRTY="procurement_dirty_v1",MERGED="procurement_merged_v1";
var db=null,docRef=null,cloudReady=false,booted=false,pushTimer=null,badge=document.getElementById("cloud");
function setBadge(t,c){if(badge){badge.textContent=t;badge.className=c||""}}
try{
 if(typeof firebase!=="undefined"){firebase.initializeApp(firebaseConfig);db=firebase.firestore();docRef=db.collection("apps").doc("wfp_monitoring")}
 else setBadge("☁ Offline (saved on this device only)","bad");
}catch(e){setBadge("☁ Cloud unavailable","bad")}
function pushCloud(){if(window.APP_ROLE!=="admin")return;
 if(!docRef||!cloudReady)return;
 clearTimeout(pushTimer);setBadge("☁ Saving…");
 pushTimer=setTimeout(function(){
  var d={updated:firebase.firestore.FieldValue.serverTimestamp()};
  CLOUD_KEYS.forEach(function(k){d[k]=localStorage.getItem(k)||"null"});
  docRef.set(d).then(function(){try{localStorage.removeItem(DIRTY)}catch(e){}setBadge("☁ Synced","ok")})
   .catch(function(){setBadge("☁ Not synced – will retry on next change","bad")});
 },800);
}
function save(k,v){
 if(window.APP_ROLE!=="admin")return; /* viewers are read-only */
 try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}
 if(booted&&CLOUD_KEYS.indexOf(k)>=0){try{localStorage.setItem(DIRTY,"1")}catch(e){}pushCloud()}
}
var uid=function(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)};
var money=function(n){return Number(n||0).toLocaleString("en-PH",{minimumFractionDigits:2,maximumFractionDigits:2})};
var qty=function(n){return Number(n||0).toLocaleString("en-PH",{maximumFractionDigits:2})};
var esc=function(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})};
var Q=["1st","2nd","3rd","4th"];

var items=load(KEY,[]),txs=load(TXK,[]),meta=load(META,{}),years=load(YK,[]),custom=load(OBJKEY,[]),alloc=load(ALK,[]);
var thisYear=new Date().getFullYear(),year=+load(CY,0)||+meta.year||thisYear,editing=null,prevObj="";
items.forEach(function(it){if(!it.id)it.id=uid();if(!it.year)it.year=+meta.year||thisYear;if(years.indexOf(+it.year)<0)years.push(+it.year)});
if(years.indexOf(year)<0)years.push(year);
save(KEY,items);save(YK,years);
var yi=function(){return items.filter(function(i){return +i.year===year}).sort(function(a,b){return(a.acct||"~").localeCompare(b.acct||"~",undefined,{numeric:true})})};
var byId=function(id){for(var i=0;i<items.length;i++)if(items[i].id===id)return items[i]};
var tot=function(it){return it.q.reduce(function(a,b){return a+b},0)};

/* ---------- year ---------- */
function fillYear(){
 years.sort(function(a,b){return b-a});
 var h="";years.forEach(function(y){h+='<option value="'+y+'">'+y+'</option>'});
 $("year").innerHTML=h+'<option value="__add__">+ Add year…</option>';$("year").value=year;
}
$("year").onchange=function(){
 var v=$("year").value;
 if(v==="__add__"){
  var y=parseInt(prompt("Enter the year to add (for example 2028):"),10);
  if(!(y>=2000&&y<=2100)){$("year").value=year;return}
  if(years.indexOf(y)<0){years.push(y);save(YK,years)}
  v=y;
 }
 year=+v;save(CY,year);fillYear();clearForm();renderAll();
};

/* ---------- tabs ---------- */
function tab(w){
 $("tabAN").classList.toggle("hidden",w!=="AN");$("tabBtnAN").setAttribute("aria-selected",w==="AN");
 $("tabWF").classList.toggle("hidden",w!=="WF");$("tabBtnWF").setAttribute("aria-selected",w==="WF");
 $("tabOB").classList.toggle("hidden",w!=="OB");$("tabBM").classList.toggle("hidden",w!=="BM");
 $("tabAL").classList.toggle("hidden",w!=="AL");$("tabBtnAL").setAttribute("aria-selected",w==="AL");
 $("tabBtnOB").setAttribute("aria-selected",w==="OB");$("tabBtnBM").setAttribute("aria-selected",w==="BM");
}
$("tabBtnWF").onclick=function(){tab("WF")};
$("tabBtnOB").onclick=function(){tab("OB")};
$("tabBtnBM").onclick=function(){tab("BM")};
$("tabBtnAL").onclick=function(){tab("AL")};
$("tabBtnAN").onclick=function(){tab("AN")};
$("saveCloud").onclick=function(){if(!cloudReady){alert("Cloud is not connected yet.");return}pushCloud()};

/* ---------- Object of Expenditure ---------- */
var OBJ=[
["5 01 01 010 00","Salaries and Wages – Regular"],["5 01 01 020 00","Salaries and Wages – Casual/Contractual"],
["5 01 02 010 00","Personal Economic Relief Allowance (PERA)"],["5 01 02 020 00","Representation Allowance (RA)"],["5 01 02 030 00","Transportation Allowance (TA)"],
["5 01 02 040 00","Clothing/Uniform Allowance"],["5 01 02 050 00","Subsistence Allowance"],["5 01 02 060 00","Laundry Allowance"],["5 01 02 070 00","Quarters Allowance"],
["5 01 02 080 00","Productivity Incentive Allowance"],["5 01 02 100 00","Honoraria"],["5 01 02 110 00","Hazard Pay"],["5 01 02 120 00","Longevity Pay"],
["5 01 02 130 00","Overtime and Night Pay"],["5 01 02 140 00","Year-End Bonus"],["5 01 02 150 00","Cash Gift"],["5 01 02 990 00","Other Bonuses and Allowances"],
["5 01 03 010 00","Retirement and Life Insurance Premiums (GSIS)"],["5 01 03 020 00","PAG-IBIG Contributions"],["5 01 03 030 00","PhilHealth Contributions"],
["5 01 03 040 00","Employees Compensation Insurance Premiums (ECIP)"],["5 01 04 020 00","Terminal Leave Benefits"],["5 01 04 030 00","Pension Benefits"],["5 01 04 990 00","Other Personnel Benefits"],
["5 02 01 010 00","Traveling Expenses – Local"],["5 02 01 020 00","Traveling Expenses – Foreign"],["5 02 02 010 00","Training Expenses"],["5 02 02 020 00","Scholarship Grants/Expenses"],
["5 02 03 010 00","Office Supplies Expenses"],["5 02 03 020 00","Accountable Forms Expenses"],["5 02 03 070 00","Drugs and Medicines Expenses"],
["5 02 03 080 00","Medical, Dental, and Laboratory Supplies Expenses"],["5 02 03 090 00","Fuel, Oil, and Lubricants Expenses"],
["5 02 03 210 00","Semi-Expendable Machinery and Equipment Expenses"],["5 02 03 220 00","Semi-Expendable Furniture, Fixtures, and Books Expenses"],["5 02 03 990 00","Other Supplies and Materials Expenses"],
["5 02 04 010 00","Water Expenses"],["5 02 04 020 00","Electricity Expenses"],["5 02 05 010 00","Postage and Courier Services"],["5 02 05 020 00","Telephone Expenses"],
["5 02 05 030 00","Internet Subscription Expenses"],["5 02 05 040 00","Cable, Satellite, Telegraph, and Radio Expenses"],
["5 02 11 010 00","Legal Services"],["5 02 11 020 00","Auditing Services"],["5 02 11 030 00","Consultancy Services"],["5 02 11 990 00","Other Professional Services"],
["5 02 12 010 00","Environment/Sanitary Services"],["5 02 12 020 00","Janitorial Services"],["5 02 12 030 00","Security Services"],["5 02 12 990 00","Other General Services"],
["5 02 13 040 00","Repairs and Maintenance – Buildings and Other Structures"],["5 02 13 050 00","Repairs and Maintenance – Machinery and Equipment"],
["5 02 13 060 00","Repairs and Maintenance – Transportation Equipment"],["5 02 13 070 00","Repairs and Maintenance – Furniture and Fixtures"],
["5 02 15 010 00","Taxes, Duties, and Licenses"],["5 02 15 020 00","Fidelity Bond Premiums"],["5 02 15 030 00","Insurance Expenses"],
["5 02 99 010 00","Advertising Expenses"],["5 02 99 020 00","Printing and Publication Expenses"],["5 02 99 030 00","Representation Expenses"],["5 02 99 050 00","Rent/Lease Expenses"],
["5 02 99 060 00","Membership Dues and Contributions to Organizations"],["5 02 99 070 00","Subscription Expenses"],["5 02 99 990 00","Other Maintenance and Operating Expenses"],
["5 03 01 010 00","Management Supervision/Contingency Fees"],["5 03 01 020 00","Bank Charges"],["5 03 01 040 00","Interest Expenses"],["5 03 01 990 00","Other Financial Charges"],
["1 06 04 010 00","Buildings"],["1 06 05 020 00","Office Equipment"],["1 06 05 030 00","Information and Communication Technology Equipment"],
["1 06 05 070 00","Communication Equipment"],["1 06 06 010 00","Motor Vehicles"],["1 06 07 010 00","Furniture and Fixtures"]];
function objInit(){if(custom.some(function(o){return o[0]==="#full"}))return;var m={};custom.forEach(function(o){m[o[0]]=o});OBJ.forEach(function(o){if(!m[o[0]])m[o[0]]=o});custom=Object.keys(m).map(function(k){return m[k]});custom.push(["#full","1"]);save(OBJKEY,custom)}
var allObj=function(){return custom.filter(function(o){return o[0]!=="#full"}).sort(function(a,b){return a[0].localeCompare(b[0],undefined,{numeric:true})})};
objInit();
function codeOf(n){var a=allObj();for(var i=0;i<a.length;i++)if(a[i][1]===n)return a[i][0];return""}
function fillObj(sel){
 var h="";allObj().forEach(function(o){h+='<option value="'+esc(o[1])+'"></option>'});
 $("objList").innerHTML=h;$("obj").value=sel||"";
}
$("obj").addEventListener("change",function(){
 var v=$("obj").value.trim(),hit=allObj().filter(function(o){return o[1].toLowerCase()===v.toLowerCase()})[0];
 if(!v){prevObj="";$("acct").value="";return}
 if(hit){v=hit[1];$("obj").value=v;prevObj=v;$("acct").value=hit[0];return}
 if(confirm("\""+v+"\" is not in the list. Add it as a new Object of Expenditure?")){
  var code=(prompt("Account Code for \""+v+"\":")||"").trim();
  if(code){custom.push([code,v]);save(OBJKEY,custom);fillObj(v);prevObj=v;$("acct").value=code;return}
 }
 $("obj").value=prevObj;$("acct").value=codeOf(prevObj);
});
$("mode").addEventListener("change",function(){
 var v=$("mode").value.trim().toLowerCase();if(!v){return}
 var ok=uniq(MODES.concat(items.map(function(i){return i.mode}))).filter(function(m){return m.toLowerCase()===v})[0];
 if(ok)$("mode").value=ok;else{alert("Mode of Procurement must be Procurement or Non-Procurement.");$("mode").value=""}
});
[].forEach.call(document.querySelectorAll("input[list]"),function(i){i.addEventListener("focus",function(){try{this.select()}catch(e){}})});

/* ---------- Office Budget form ---------- */
function entryShow(on,np){$("entryBody").classList.toggle("hidden",!on);$("entryToggle").textContent=on?"Hide form":"Show form";if(!np)try{localStorage.setItem("wfp_entry_hidden",on?"0":"1")}catch(e){}}
$("entryToggle").onclick=function(){entryShow($("entryBody").classList.contains("hidden"))};
try{if(localStorage.getItem("wfp_entry_hidden")==="1")entryShow(false)}catch(e){}
function calcForm(){
 var p=parseFloat($("price").value)||0,t=0;
 for(var i=1;i<=4;i++){var q=parseFloat($("q"+i).value)||0;t+=q;$("a"+i).value=money(q*p)}
 $("tq").value=qty(t);$("eb").value=money(t*p);
 if(typeof wfpForm==="function")wfpForm();
}
["price","q1","q2","q3","q4"].forEach(function(id){$(id).addEventListener("input",calcForm)});
function itemTotals(ex){var m={};yi().forEach(function(it){if(ex&&it.id===ex)return;for(var k=0;k<4;k++){var key=it.act+"|"+it.obj+"|"+k;m[key]=(m[key]||0)+it.q[k]*it.price}});return m}
function wfpOf(act,obj,k){var w=0;alloc.forEach(function(r){if(+r.year===year&&r.act===act&&r.obj===obj)w+=r.q[k]});return w}
function overWfp(list,qs){var T=itemTotals(),seen={},amt=0,n=0;list.forEach(function(it){qs.forEach(function(k){var key=it.act+"|"+it.obj+"|"+k;if(seen[key])return;seen[key]=1;var d=(T[key]||0)-wfpOf(it.act,it.obj,k);if(d>0.005){amt+=d;n++}})});return{amt:amt,n:n}}
function wfpForm(){
 var el=$("wfpMsg");el.innerHTML="";var act=$("act").value.trim(),on=$("obj").value.trim().toLowerCase(),hit=allObj().filter(function(o){return o[1].toLowerCase()===on})[0];
 if(!act||!hit)return;
 var T=itemTotals(typeof editing!=="undefined"?editing:null),pr=parseFloat($("price").value)||0,h="";
 for(var k=0;k<4;k++){var add=(parseFloat($("q"+(k+1)).value)||0)*pr;if(!(add>0))continue;
  var w=wfpOf(act,hit[1],k),sofar=T[act+"|"+hit[1]+"|"+k]||0,after=sofar+add,over=after-w;
  h+="<div style='color:"+(over>0.005?"#b3261e":"inherit")+"'>"+Q[k]+" Quarter — WFP: "+money(w)+" · other items: "+money(sofar)+" · with this item: "+money(after)+(over>0.005?" — OVER the WFP by "+money(over)+(w?"":" (no WFP entered for this activity and object)"):" — within WFP")+"</div>"}
 el.innerHTML=h;
}
$("act").addEventListener("input",wfpForm);$("obj").addEventListener("input",wfpForm);$("obj").addEventListener("change",wfpForm);
function refreshLists(){
 var sa={},st={},a="",t="";
 items.forEach(function(it){
  if(it.aip&&!sa[it.aip]){sa[it.aip]=1;a+='<option value="'+esc(it.aip)+'" label="'+esc(it.act||"")+'"></option>'}
  if(it.act&&!st[it.act]){st[it.act]=1;t+='<option value="'+esc(it.act)+'"></option>'}
 });
 $("aipList").innerHTML=a;$("actList").innerHTML=t;
 var sd={},d="",U=["pc","box","ream","set","pack","bottle","roll","unit","lot"],su={};
 items.forEach(function(it){if(it.desc&&!sd[it.desc.toLowerCase()]){sd[it.desc.toLowerCase()]=1;d+='<option value="'+esc(it.desc)+'"></option>'}if(it.unit&&U.indexOf(it.unit)<0)U.push(it.unit)});
 $("descList").innerHTML=d;$("units").innerHTML=U.map(function(u){return'<option value="'+esc(u)+'"></option>'}).join("");
 fillPrices();
}
function fillPrices(){
 var v=$("desc").value.trim().toLowerCase(),seen={},h="",mine=items.filter(function(i){return i.desc&&i.desc.toLowerCase()===v&&i.price});
 (mine.length?mine:items).slice().reverse().forEach(function(i){if(i.price&&!seen[i.price]){seen[i.price]=1;h+='<option value="'+i.price+'"></option>'}});
 $("priceList").innerHTML=h;
}
function pickDesc(){
 var v=$("desc").value.trim().toLowerCase();fillPrices();if(!v)return;
 for(var i=items.length-1;i>=0;i--)if(items[i].desc&&items[i].desc.toLowerCase()===v){
  var it=items[i],ed=editing!==null;
  if(it.unit&&(!ed||!$("unit").value))$("unit").value=it.unit;
  if(it.price&&(!ed||!$("price").value))$("price").value=it.price;
  calcForm();return;
 }
}
$("desc").addEventListener("input",pickDesc);$("desc").addEventListener("change",pickDesc);
function pickAip(){
 var v=$("aip").value.trim().toLowerCase();if(!v)return;
 for(var i=0;i<items.length;i++)if(String(items[i].aip).toLowerCase()===v&&items[i].act){$("act").value=items[i].act;return}
}
$("aip").addEventListener("input",pickAip);$("aip").addEventListener("change",pickAip);
function clearForm(){
 ["aip","act","desc","stock","unit","price","mode","q1","q2","q3","q4"].forEach(function(id){$(id).value=""});
 $("obj").value="";$("acct").value="";prevObj="";editing=null;
 $("formTitle").textContent="Add item";$("btnSave").textContent="Add item";$("btnCancel").classList.add("hidden");$("err").textContent="";calcForm();
}
$("btnSave").onclick=function(){
 var it={aip:$("aip").value.trim(),act:$("act").value.trim(),desc:$("desc").value.trim(),obj:$("obj").value,acct:$("acct").value,stock:$("stock").value.trim(),
  unit:$("unit").value.trim(),price:parseFloat($("price").value)||0,mode:$("mode").value.trim(),
  q:[1,2,3,4].map(function(i){return parseFloat($("q"+i).value)||0})},e=$("err");
 if(!it.aip||!it.act||!it.desc){e.textContent="Enter the AIP Code, Activities and Description.";return}
 if(!it.obj||it.obj==="__add__"){e.textContent="Select an Object of Expenditure.";return}
 if(!(it.price>0)){e.textContent="Enter a Unit Price greater than zero.";return}
 if(tot(it)<=0){e.textContent="Enter a quantity for at least one quarter.";return}
 if(editing===null){it.id=uid();it.year=year;items.push(it)}
 else{var o=byId(editing);it.id=o.id;it.year=o.year;items[items.indexOf(o)]=it}
 save(KEY,items);clearForm();renderAll();refreshLists();$("aip").focus();
};
$("btnCancel").onclick=clearForm;$("btnClear").onclick=clearForm;
function edit(id){
 var it=byId(id);if(!it)return;editing=id;
 $("aip").value=it.aip;$("act").value=it.act||"";$("desc").value=it.desc;$("stock").value=it.stock;$("unit").value=it.unit;
 $("price").value=it.price;modeSet(it.mode);$("obj").value=it.obj||"";$("acct").value=it.acct||"";prevObj=$("obj").value;
 for(var k=0;k<4;k++)$("q"+(k+1)).value=it.q[k]||"";
 calcForm();entryShow(true,1);$("formTitle").textContent="Edit item";$("btnSave").textContent="Update item";$("btnCancel").classList.remove("hidden");
 window.scrollTo({top:0,behavior:"smooth"});$("aip").focus();
}

/* ---------- Office Budget report ---------- */
function renderOB(){
 var list=fi("ob"),h="",gq=0,gb=0,gqq=[0,0,0,0],ga=[0,0,0,0];
 if(!list.length){$("obBody").innerHTML='<tr><td class="empty" colspan="20">'+(yi().length?"No items match the selected filters.":"No items for "+year+" yet. Fill in the form above and select Add item.")+'</td></tr>';$("obFoot").innerHTML="";return}
 list.forEach(function(it){
  var t=tot(it),b=t*it.price;gq+=t;gb+=b;
  h+="<tr><td>"+esc(it.aip)+"</td><td>"+esc(it.act)+"</td><td>"+esc(it.desc)+"</td><td>"+esc(it.obj)+"</td><td style='white-space:nowrap'>"+esc(it.acct)+"</td><td>"+esc(it.stock)+"</td><td class='c'>"+esc(it.unit)+"</td><td class='n'>"+money(it.price)+"</td><td class='n'>"+qty(t)+"</td><td class='n'>"+money(b)+"</td><td>"+esc(it.mode)+"</td>";
  for(var k=0;k<4;k++){var a=it.q[k]*it.price;gqq[k]+=it.q[k];ga[k]+=a;h+="<td class='n'>"+(it.q[k]?qty(it.q[k]):"")+"</td><td class='n'>"+(a?money(a):"")+"</td>"}
  h+="<td class='act'><button data-e='"+it.id+"'>Edit</button><button class='d' data-d='"+it.id+"'>Delete</button></td></tr>";
 });
 $("obBody").innerHTML=h;
 $("obFoot").innerHTML="<tr><td colspan='8' style='text-align:right'>TOTAL</td><td class='n'>"+qty(gq)+"</td><td class='n'>"+money(gb)+"</td><td></td>"+
  gqq.map(function(v,k){return"<td class='n'>"+qty(v)+"</td><td class='n'>"+money(ga[k])+"</td>"}).join("")+"<td class='act'></td></tr>";
}
function delItem(id){
 var it=byId(id),n=txs.filter(function(x){return x.from===id||x.to===id}).length;
 if(!confirm("Delete \""+it.desc+"\" from the report?"+(n?"\n\nIts "+n+" release/augmentation record(s) will also be deleted.":"")))return;
 items.splice(items.indexOf(it),1);txs=txs.filter(function(x){return x.from!==id&&x.to!==id});
 if(editing===id)clearForm();save(KEY,items);save(TXK,txs);renderAll();refreshLists();
}
$("obBody").addEventListener("click",function(e){
 var b=e.target.closest("button");if(!b)return;
 if(b.dataset.e)edit(b.dataset.e);else if(b.dataset.d)delItem(b.dataset.d);
});
$("btnAll").onclick=function(){
 var l=yi();
 if(l.length&&confirm("Delete all "+l.length+" items for "+year+" (and their releases/augmentations)? This cannot be undone.")){
  var ids=l.map(function(i){return i.id});
  items=items.filter(function(i){return +i.year!==year});
  txs=txs.filter(function(x){return ids.indexOf(x.from)<0&&ids.indexOf(x.to)<0});
  save(KEY,items);save(TXK,txs);clearForm();renderAll();refreshLists();
 }
};

/* ---------- Budget Monitoring ---------- */
var BASE=["AIP Code","Activities","Description","Object of Expenditure","Account Code","Stock No.","Unit","Unit Price","Total Qty","Estimated Budget","Mode of Procurement"];
var SUB=["Amount","Release","Augmented From (−)","Augmented To (+)","Balance"];
(function(){
 var h="<tr>";BASE.forEach(function(b){h+='<th rowspan="2">'+b+'</th>'});
 Q.forEach(function(q){h+='<th colspan="5">'+q+' Quarter</th>'});
 h+='<th rowspan="2">Total Balance</th></tr><tr>';
 for(var k=0;k<4;k++)SUB.forEach(function(s){h+="<th>"+s+"</th>"});
 $("bmHead").innerHTML=h+"</tr>";
})();
var LCm=null,LCt=null,LCn=-1;
function lineCalc(it){
 if(LCt!==txs||LCn!==txs.length){LCm={};var Z=function(id){return LCm[id]||(LCm[id]={r:[0,0,0,0],t:[0,0,0,0],f:[0,0,0,0]})};txs.forEach(function(x){if(x.type==="rel")Z(x.from).r[x.fq]+=x.amt;else{Z(x.from).t[x.fq]+=x.amt;Z(x.to).f[x.tq]+=x.amt}});LCt=txs;LCn=txs.length}
 var a=LCm[it.id]||{r:[0,0,0,0],t:[0,0,0,0],f:[0,0,0,0]},b=[],bal=[],k;
 for(k=0;k<4;k++){b[k]=it.q[k]*it.price;bal[k]=b[k]-a.r[k]-a.t[k]+a.f[k]}
 return{b:b,r:a.r,t:a.t,f:a.f,bal:bal};
}
var lineLabel=function(it){return it?it.act+" – "+it.obj+" ("+it.acct+") – "+it.aip+" – "+it.desc:"(deleted item)"};
var cell=function(v,cls){return"<td class='n"+(cls?" "+cls:"")+"'>"+(v?money(v):"")+"</td>"};
function renderBM(){
 var list=fi("bm"),h="",T=[],i;for(i=0;i<20;i++)T[i]=0;var tb=0;
 if(!list.length){$("bmBody").innerHTML='<tr><td class="empty" colspan="32">'+(yi().length?"No budget lines match the selected filters.":"No budget lines for "+year+". Add items in Office Budget first.")+'</td></tr>';$("bmFoot").innerHTML=""}
 else{
  list.forEach(function(it){
   var c=lineCalc(it),t=tot(it),sum=0;
   h+="<tr><td>"+esc(it.aip)+"</td><td>"+esc(it.act)+"</td><td>"+esc(it.desc)+"</td><td>"+esc(it.obj)+"</td><td style='white-space:nowrap'>"+esc(it.acct)+"</td><td>"+esc(it.stock)+"</td><td class='c'>"+esc(it.unit)+"</td><td class='n'>"+money(it.price)+"</td><td class='n'>"+qty(t)+"</td><td class='n'>"+money(t*it.price)+"</td><td>"+esc(it.mode)+"</td>";
   for(var k=0;k<4;k++){
    h+=cell(c.b[k])+cell(c.r[k])+cell(c.t[k])+cell(c.f[k])+"<td class='n bal"+(c.bal[k]<-0.005?" neg":"")+"'>"+((c.b[k]||c.bal[k])?money(c.bal[k]):"")+"</td>";
    T[k*5]+=c.b[k];T[k*5+1]+=c.r[k];T[k*5+2]+=c.t[k];T[k*5+3]+=c.f[k];T[k*5+4]+=c.bal[k];sum+=c.bal[k];
   }
   tb+=sum;h+="<td class='n bal"+(sum<-0.005?" neg":"")+"'>"+money(sum)+"</td></tr>";
  });
  $("bmBody").innerHTML=h;
  $("bmFoot").innerHTML="<tr><td colspan='11' style='text-align:right'>TOTAL</td>"+T.slice(0,20).map(function(v){return"<td class='n'>"+money(v)+"</td>"}).join("")+"<td class='n'>"+money(tb)+"</td></tr>";
 }
 // transaction log
 var lg="";
 txs.forEach(function(x){
  var s=byId(x.from);if(!s||+s.year!==year)return;if(list.indexOf(s)<0&&list.indexOf(byId(x.to))<0)return;if(!lgOk(x,s))return;
  lg+="<tr><td>"+esc(x.date||"")+"</td><td>"+(x.type==="rel"?"Release":"Augmentation")+"</td><td>"+esc(lineLabel(s))+" ("+Q[x.fq]+" Quarter)</td><td>"+
   (x.type==="aug"?esc(lineLabel(byId(x.to)))+" ("+Q[x.tq]+" Quarter)":"")+"</td><td class='n'>"+(x.qty?x.qty:"")+"</td><td class='n'>"+money(x.amt)+"</td><td>"+esc(x.note||"")+"</td><td>"+(isCan(x)?"<b style='color:var(--warn)'>Cancelled</b>":"")+"</td><td class='act'><button data-e='"+x.id+"'>Edit</button> <button class='d' data-t='"+x.id+"'>Delete</button></td></tr>";
 });
 $("lgBody").innerHTML=lg||'<tr><td class="empty" colspan="9">No releases or augmentations recorded for '+year+'.</td></tr>';
}
var TF={act:[],type:[],q:[],rem:[],stat:[]},txEdit=null;
function isCan(x){return x.status?x.status==="Cancelled":/cancel/i.test(x.note||"")}
function lgOn(){return TF.act.length||TF.type.length||TF.q.length||TF.rem.length||TF.stat.length}
function lgOk(x,s){var d=byId(x.to);
 if(TF.type.length&&TF.type.indexOf(x.type)<0)return false;
 if(TF.act.length&&!(TF.act.indexOf(s.act)>=0||(x.type==="aug"&&d&&TF.act.indexOf(d.act)>=0)))return false;
 if(TF.stat.length&&TF.stat.indexOf(isCan(x)?"can":"act")<0)return false;
 if(TF.rem.length){var n=(x.note||"").trim().toLowerCase();if(!TF.rem.some(function(r){return r==="__none__"?n==="":n===r.toLowerCase()}))return false}
 if(TF.q.length&&!TF.q.some(function(k){k=+k;return x.fq===k||(x.type==="aug"&&x.tq===k)}))return false;
 return true}
function fillLgFilt(){
 var a=uniq(yi().map(function(i){return i.act})),f=$("lgFilt"),g=function(k){return f.querySelector('[data-lf="'+k+'"]')};
 TF.act=TF.act.filter(function(v){return a.indexOf(v)>=0});
 var seen={},rm=[];txs.forEach(function(x){var n=(x.note||"").trim(),k=n.toLowerCase();if(n&&!seen[k]){seen[k]=1;rm.push(n)}});rm.sort(function(x,y){return x.localeCompare(y)});
 TF.rem=TF.rem.filter(function(r){return r==="__none__"||seen[r.toLowerCase()]});
 msFill(g("act"),L1(a),TF.act,"All activities");msFill(g("type"),[{v:"rel",t:"Release"},{v:"aug",t:"Augmentation"}],TF.type,"All transactions");msFill(g("q"),QO(),TF.q,"All quarters");
 msFill(g("rem"),[{v:"__none__",t:"(No remarks)"}].concat(L1(rm)),TF.rem,"All remarks");msFill(g("stat"),[{v:"act",t:"Active"},{v:"can",t:"Cancelled"}],TF.stat,"All");
}
$("lgFilt").addEventListener("change",function(e){var b=e.target.closest(".ms");if(!b||!b.dataset.lf)return;TF[b.dataset.lf]=msVal(b);msNow(b);later(function(){fillLgFilt();renderBM()})});
$("lgFilt").addEventListener("click",function(e){var mc=msClear(e);if(mc){TF[mc.dataset.lf]=[];fillLgFilt();renderBM();return}if(e.target.dataset.lclr){TF={act:[],type:[],q:[],rem:[],stat:[]};fillLgFilt();renderBM()}});
function txReset(){txEdit=null;$("btnTx").textContent="Add transaction";$("btnTxCancel").classList.add("hidden");$("tQty").value="";$("tAmt").value="";$("tNote").value="";$("tStat").value="";$("terr").textContent=""}
function txLoad(x){
 var s=byId(x.from),d=byId(x.to);if(!s)return;
 $("tType").value=x.type;typeUi();
 $("fAct").value=s.act;fillTx();$("fObj").value=s.obj;
 if(d){$("tAct").value=d.act;fillTx();$("tObj").value=d.obj}
 fillTx();$("tFrom").value=s.id;if(d)$("tTo").value=d.id;
 $("tFq").value=x.fq;$("tTq").value=x.tq||0;$("tQty").value=x.qty||Math.round(x.amt/s.price*10000)/10000;$("tDate").value=x.date||"";$("tNote").value=x.note||"";$("tStat").value=isCan(x)?"Cancelled":"";
 txEdit=x.id;$("btnTx").textContent="Save changes";$("btnTxCancel").classList.remove("hidden");$("terr").textContent="";info();
 $("btnTx").scrollIntoView({behavior:"smooth",block:"center"});
}
$("lgBody").addEventListener("click",function(e){var b=e.target.closest("button");if(b&&b.dataset.e){var x=txs.filter(function(t){return t.id===b.dataset.e})[0];if(x)txLoad(x)}});
$("btnTxCancel").onclick=txReset;
$("lgBody").addEventListener("click",function(e){
 var b=e.target.closest("button");if(!b||!b.dataset.t)return;
 if(confirm("Delete this transaction? The balances will be restored.")){if(txEdit===b.dataset.t)txReset();txs=txs.filter(function(x){return x.id!==b.dataset.t});save(TXK,txs);renderAll();info()}
});

/* transaction form */
function fillTx(){
 fillLgFilt();
 ["f","t"].forEach(function(p){
  var L=$(p==="f"?"tFrom":"tTo"),A=$(p+"Act"),O=$(p+"Obj"),it=byId(L.value),act=A.value,obj=O.value;
  if(it&&!act){act=it.act;obj=it.obj}
  var acts=uniq(yi().map(function(i){return i.act}));if(acts.indexOf(act)<0){act="";obj=""}
  A.innerHTML=opts(acts,act,"Select activity…");
  var objs=uniq(yi().filter(function(i){return i.act===act}).map(function(i){return i.obj})).sort(byObj);if(objs.indexOf(obj)<0)obj="";
  O.innerHTML=opts(objs,obj,"Select object of expenditure…");$(p+"Acct").value=obj?codeOf(obj):"";
  var lines=yi().filter(function(i){return i.act===act&&i.obj===obj}),prev=L.value;
  L.innerHTML=lines.length?lines.map(function(i){return'<option value="'+i.id+'">'+esc(i.aip+" – "+i.desc+" (₱"+money(i.price)+")")+'</option>'}).join(""):'<option value="">Select the activity and object first</option>';
  if(prev&&lines.some(function(i){return i.id===prev}))L.value=prev;
 });
 info();
}
["f","t"].forEach(function(p){$(p+"Act").onchange=function(){$(p+"Obj").value="";fillTx()};$(p+"Obj").onchange=fillTx});
function info(){
 var it=byId($("tFrom").value),q=+$("tFq").value,bal=it?lineCalc(it).bal[q]:0;
 $("tInfo").textContent=it?"Unit price: "+money(it.price)+" — available in "+Q[q]+" Quarter: "+money(bal)+" (about "+(Math.floor(bal/it.price*100)/100)+" "+(it.unit||"units")+")":"";
 txAmt();

}

function txAmt(){var it=byId($("tFrom").value),q=parseFloat($("tQty").value)||0;$("tAmt").value=(it&&q>0)?money(Math.round(q*it.price*100)/100):""}
$("tQty").addEventListener("input",info);
function typeUi(){
 var aug=$("tType").value==="aug";
 [].forEach.call(document.querySelectorAll(".augonly"),function(el){el.classList.toggle("hidden",!aug)});
 var pre=aug?"Augmented from – ":"";$("lFa").textContent=pre+"Activities";$("lFo").textContent=pre+"Object of Expenditure";$("lFc").textContent=pre+"Account Code";$("lFrom").textContent=pre+"Item (budget line)";$("lFq").textContent=aug?"Augmented from quarter":"Quarter of release";
}
$("tType").onchange=function(){typeUi();info()};$("tFrom").onchange=info;$("tFq").onchange=info;
$("tDate").value=new Date().toISOString().slice(0,10);
$("btnTx").onclick=function(){
 var type=$("tType").value,from=$("tFrom").value,fq=+$("tFq").value,to=$("tTo").value,tq=+$("tTq").value,qty=parseFloat($("tQty").value)||0,e=$("terr"),src=byId(from),amt=src?Math.round(qty*src.price*100)/100:0;
 if(!src){e.textContent="Select the Activity, Object of Expenditure and the item.";return}
 if(!(amt>0)){e.textContent="Enter a quantity greater than zero.";return}
 var keep=txs;if(txEdit)txs=txs.filter(function(t){return t.id!==txEdit});var av=lineCalc(src).bal[fq];txs=keep;
 if(amt>av+0.005){e.textContent="The amount of "+money(amt)+" ("+qty+" × "+money(src.price)+") is more than the "+Q[fq]+" Quarter balance of "+money(av)+".";return}
 if(type==="aug"){
  if(!byId(to)){e.textContent="Select the Activity, Object of Expenditure and item it is augmented to.";return}
  if(to===from&&tq===fq){e.textContent="Choose a different budget line or quarter to augment to.";return}
 }
 var rec={id:txEdit||uid(),type:type,from:from,fq:fq,to:type==="aug"?to:"",tq:tq,qty:qty,amt:amt,date:$("tDate").value,note:$("tNote").value.trim(),status:$("tStat").value};
 if(txEdit){txs=txs.map(function(t){return t.id===txEdit?rec:t})}else txs.push(rec);
 save(TXK,txs);txReset();renderAll();info();
};

/* ---------- report details ---------- */
var mm={mOffice:"office",mBy:"by",mApp:"app"};
function paintMeta(){
 ["ob","bm","wf"].forEach(function(p){
  $(p+"Title").textContent=({ob:"OFFICE BUDGET ",bm:"BUDGET MONITORING ",wf:"WORK FINANCIAL PLAN "})[p]+year;
  $(p+"Office").textContent=meta.office||"";$(p+"Year").textContent="Fiscal Year "+year;
 });
 [].forEach.call(document.querySelectorAll(".sBy"),function(e){e.textContent="Prepared by: "+(meta.by||"")});
 [].forEach.call(document.querySelectorAll(".sApp"),function(e){e.textContent="Approved by: "+(meta.app||"")});
}
Object.keys(mm).forEach(function(id){
 $(id).value=meta[mm[id]]||"";
 $(id).addEventListener("input",function(){meta[mm[id]]=$(id).value;save(META,meta);paintMeta()});
});

/* ---------- Excel import / template / export of items ---------- */
var IH=["Year","AIP Code","Activities","Description","Object of Expenditure","Stock No.","Unit","Unit Price","Mode of Procurement","1st Quarter Qty","2nd Quarter Qty","3rd Quarter Qty","4th Quarter Qty"];
function needX(){if(typeof XLSX==="undefined"){alert("The Excel library could not load. Check your internet connection and refresh the page.");return false}return true}
function nk(h){return String(h).toLowerCase().replace(/[^a-z0-9]/g,"")}
function nm(v){return parseFloat(String(v).replace(/[₱,\s]/g,""))}
$("obTpl").onclick=function(){
 if(!needX())return;
 var wb=XLSX.utils.book_new(),ws=XLSX.utils.aoa_to_sheet([IH]);ws["!cols"]=IH.map(function(h){return{wch:Math.max(14,h.length+2)}});ws["!cols"][2]={wch:40};ws["!cols"][3]={wch:40};ws["!cols"][4]={wch:36};
 XLSX.utils.book_append_sheet(wb,ws,"Items");
 var ins=[["HOW TO USE THIS TEMPLATE"],[""],["1. Type your items in the 'Items' sheet, one item per row, under the headings. Do not rename or delete the headings."],["2. Required: AIP Code, Activities, Description, Object of Expenditure, Unit Price (greater than 0) and a quantity in at least one quarter."],["3. Object of Expenditure must be spelled exactly as in the 'Lists' sheet (capital letters do not matter)."],["4. Mode of Procurement: Procurement or Non-Procurement (or leave blank). Stock No.: type N/A if none."],["5. Year is optional. If blank, the year currently selected in the app is used."],["6. Save the file, then in the app click 'Import from Excel'. Rows with problems are listed and skipped; rows you already imported are not duplicated."],[""],["EXAMPLE ROWS (do not copy the Account Code; it is filled in automatically)"],IH,
  [2026,"1000-001-1-001","Conduct of tourism awareness seminar","Diesel fuel",allObj()[0]?allObj()[0][1]:"","N/A","liter",65.5,"Non-Procurement",100,100,50,50],
  [2026,"1000-001-1-001","Conduct of tourism awareness seminar","Bond paper, A4",allObj()[0]?allObj()[0][1]:"","N/A","ream",250,"Procurement",10,0,5,0]];
 var wi=XLSX.utils.aoa_to_sheet(ins);wi["!cols"]=[{wch:110}];XLSX.utils.book_append_sheet(wb,wi,"Instructions");
 var L=[["Object of Expenditure","Account Code","","Mode of Procurement"]];allObj().forEach(function(o,i){L.push([o[1],o[0],"",i<2?MODES[i]:""])});
 var wl=XLSX.utils.aoa_to_sheet(L);wl["!cols"]=[{wch:50},{wch:18},{wch:4},{wch:24}];XLSX.utils.book_append_sheet(wb,wl,"Lists");
 XLSX.writeFile(wb,"office-budget-import-template.xlsx");
};
$("obExp").onclick=function(){
 if(!needX())return;if(!items.length){alert("There are no items to export yet.");return}
 var rows=[IH].concat(items.slice().sort(function(a,b){return a.year-b.year}).map(function(i){return[i.year,i.aip,i.act,i.desc,i.obj,i.stock,i.unit,i.price,i.mode,i.q[0],i.q[1],i.q[2],i.q[3]]}));
 var ws=XLSX.utils.aoa_to_sheet(rows);ws["!cols"]=IH.map(function(h){return{wch:Math.max(14,h.length+2)}});ws["!cols"][2]={wch:40};ws["!cols"][3]={wch:40};ws["!cols"][4]={wch:36};
 var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Items");XLSX.writeFile(wb,"office-budget-items-"+new Date().toISOString().slice(0,10)+".xlsx");
};
$("obImp").onclick=function(){$("obFile").value="";$("obFile").click()};
$("obFile").onchange=function(){
 var f=this.files[0];if(!f||!needX())return;var r=new FileReader();
 r.onload=function(){
  var wb;try{wb=XLSX.read(r.result,{type:"array"})}catch(e){alert("That file could not be read as an Excel file.");return}
  var ws=wb.Sheets["Items"]||wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json(ws,{defval:""}),good=[],bad=[],dup=0,seen={};
  items.forEach(function(i){seen[[i.year,i.aip,i.desc,i.obj,i.price,i.q.join("|")].join("~").toLowerCase()]=1});
  rows.forEach(function(row,n){
   var g={};Object.keys(row).forEach(function(k){g[nk(k)]=row[k]});
   var pick=function(){for(var i=0;i<arguments.length;i++)if(g[arguments[i]]!==undefined)return g[arguments[i]];return""};
   var aip=String(pick("aipcode","aip")).trim(),act=String(pick("activities","activity")).trim(),desc=String(pick("description")).trim(),on=String(pick("objectofexpenditure","object")).trim();
   var pr=nm(pick("unitprice","price")),md=String(pick("modeofprocurement","mode")).trim(),yr=parseInt(pick("year"),10);
   var q=[1,2,3,4].map(function(k){var v=pick(["1st","2nd","3rd","4th"][k-1]+"quarterqty",["1st","2nd","3rd","4th"][k-1]+"quarter","q"+k);return v===""?0:nm(v)});
   if(!aip&&!act&&!desc&&!on&&!(pr>0)&&!q.some(function(x){return x>0}))return;
   var er=[],hit=allObj().filter(function(o){return o[1].toLowerCase()===on.toLowerCase()})[0];
   if(!aip)er.push("AIP Code missing");if(!act)er.push("Activities missing");if(!desc)er.push("Description missing");
   if(!on)er.push("Object of Expenditure missing");else if(!hit)er.push("Object of Expenditure not in the list: "+on);
   if(!(pr>0))er.push("Unit Price must be greater than 0");
   if(q.some(function(x){return isNaN(x)||x<0}))er.push("Quarter quantity is not a number");else if(!q.some(function(x){return x>0}))er.push("No quantity in any quarter");
   var mo="";if(md){mo=MODES.filter(function(m){return m.toLowerCase()===md.toLowerCase()})[0]||"";if(!mo)er.push("Mode must be Procurement or Non-Procurement")}
   if(er.length){bad.push("Row "+(n+2)+": "+er.join("; "));return}
   var it={id:uid(),year:(yr>=2000&&yr<=2100)?yr:year,aip:aip,act:act,desc:desc,obj:hit[1],acct:hit[0],stock:String(pick("stockno","stock")).trim(),unit:String(pick("unit")).trim(),price:pr,mode:mo,q:q};
   var key=[it.year,it.aip,it.desc,it.obj,it.price,it.q.join("|")].join("~").toLowerCase();
   if(seen[key]){dup++;return}seen[key]=1;good.push(it);
  });
  if(!good.length&&!bad.length){alert(dup?"All "+dup+" rows are already in the app.":"No rows found. Use the template and type your items under the headings.");return}
  var msg=good.length+" item(s) ready to import."+(dup?"\n"+dup+" duplicate row(s) will be skipped.":"")+(bad.length?"\n\n"+bad.length+" row(s) have problems and will be SKIPPED:\n"+bad.slice(0,12).join("\n")+(bad.length>12?"\n…and "+(bad.length-12)+" more":""):"");
  if(!good.length){alert(msg);return}
  if(!confirm(msg+"\n\nImport now?"))return;
  good.forEach(function(it){items.push(it);if(years.indexOf(it.year)<0)years.push(it.year)});
  save(YK,years);save(KEY,items);fillYear();renderAll();refreshLists();
  alert("Imported "+good.length+" item(s)."+(good.some(function(i){return i.year!==year})?"\nSome items belong to other years. Switch the Year selector to see them.":""));
 };
 r.readAsArrayBuffer(f);
};

/* ---------- Excel ---------- */
function toXlsx(name,sheets){
 if(typeof XLSX==="undefined"){
  var csv=sheets[0].rows.map(function(r){return r.map(function(c){return'"'+String(c==null?"":c).replace(/"/g,'""')+'"'}).join(",")}).join("\r\n");
  var a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv"}));a.download=name.replace(".xlsx",".csv");a.click();
  alert("The Excel library could not load (no internet), so a CSV file was saved instead. It opens in Excel.");return;
 }
 var wb=XLSX.utils.book_new();
 sheets.forEach(function(s){
  var ws=XLSX.utils.aoa_to_sheet(s.rows);ws["!merges"]=s.merges||[];ws["!cols"]=(s.cols||[]).map(function(w){return{wch:w}});
  for(var r=s.from;r<=s.to;r++){
   (s.money||[]).forEach(function(c){var x=ws[XLSX.utils.encode_cell({r:r,c:c})];if(x)x.z="#,##0.00"});
   (s.qty||[]).forEach(function(c){var x=ws[XLSX.utils.encode_cell({r:r,c:c})];if(x)x.z="#,##0.##"});
  }
  XLSX.utils.book_append_sheet(wb,ws,s.n);
 });
 XLSX.writeFile(wb,name);
}
function headMerges(nBase,lastCol,groups,groupSpan,firstGroupCol,extraCol){
 var m=[],c;
 for(c=0;c<nBase;c++)m.push({s:{r:3,c:c},e:{r:4,c:c}});
 if(extraCol!=null)m.push({s:{r:3,c:extraCol},e:{r:4,c:extraCol}});
 for(var g=0;g<groups;g++)m.push({s:{r:3,c:firstGroupCol+g*groupSpan},e:{r:3,c:firstGroupCol+g*groupSpan+groupSpan-1}});
 m.push({s:{r:0,c:0},e:{r:0,c:lastCol}},{s:{r:1,c:0},e:{r:1,c:lastCol}});
 return m;
}
function baseCells(it){var t=tot(it);return[it.aip,it.act||"",it.desc,it.obj||"",it.acct||"",it.stock,it.unit,it.price,t,t*it.price,it.mode]}

$("obXlsx").onclick=function(){
 var list=fi("ob");if(!list.length){alert("There are no items for "+year+" to save yet.");return}
 var h1=BASE.slice(),h2=BASE.map(function(){return""}),k;
 Q.forEach(function(q){h1.push(q+" Quarter","");h2.push("Quantity","Amount")});
 var rows=[["OFFICE BUDGET "+year],[meta.office||""],[],h1,h2],gq=0,gb=0,gqq=[0,0,0,0],ga=[0,0,0,0];
 list.forEach(function(it){
  var r=baseCells(it);gq+=tot(it);gb+=tot(it)*it.price;
  for(k=0;k<4;k++){var a=it.q[k]*it.price;gqq[k]+=it.q[k];ga[k]+=a;r.push(it.q[k],a)}
  rows.push(r);
 });
 var tr=["TOTAL","","","","","","","",gq,gb,""];for(k=0;k<4;k++)tr.push(gqq[k],ga[k]);rows.push(tr,[]);
 rows.push(["Prepared by: "+(meta.by||""),"","","","","","","","","","","Approved by: "+(meta.app||"")]);
 toXlsx("Office_Budget_"+year+".xlsx",[{n:"Office Budget",rows:rows,merges:headMerges(11,18,4,2,11),cols:[14,30,38,34,16,12,8,12,12,16,26,10,14,10,14,10,14,10,14],
  money:[7,9,12,14,16,18],qty:[8,11,13,15,17],from:5,to:5+list.length}]);
};
$("bmXlsx").onclick=function(){
 var list=fi("bm");if(!list.length){alert("There are no budget lines for "+year+" to save yet.");return}
 var h1=BASE.slice(),h2=BASE.map(function(){return""}),k,T=[];
 Q.forEach(function(q){h1.push(q+" Quarter","","","","");SUB.forEach(function(s){h2.push(s)})});
 h1.push("Total Balance");h2.push("");
 var rows=[["BUDGET MONITORING "+year],[meta.office||""],[],h1,h2],tb=0;for(k=0;k<20;k++)T[k]=0;
 list.forEach(function(it){
  var c=lineCalc(it),r=baseCells(it),s=0;
  for(k=0;k<4;k++){r.push(c.b[k],c.r[k],c.t[k],c.f[k],c.bal[k]);T[k*5]+=c.b[k];T[k*5+1]+=c.r[k];T[k*5+2]+=c.t[k];T[k*5+3]+=c.f[k];T[k*5+4]+=c.bal[k];s+=c.bal[k]}
  tb+=s;r.push(s);rows.push(r);
 });
 rows.push(["TOTAL","","","","","","","","","",""].concat(T,[tb]),[]);
 rows.push(["Prepared by: "+(meta.by||""),"","","","","","","","","","","Approved by: "+(meta.app||"")]);
 var cols=[14,30,38,34,16,12,8,12,12,16,26];for(k=0;k<21;k++)cols.push(14);
 var lg=[["Date","Type","From (budget line)","From quarter","Augmented to (budget line)","To quarter","Quantity","Amount","Remarks","Status"]];
 txs.forEach(function(x){
  var s=byId(x.from);if(!s||+s.year!==year)return;
  lg.push([x.date||"",x.type==="rel"?"Release":"Augmentation",lineLabel(s),Q[x.fq]+" Quarter",x.type==="aug"?lineLabel(byId(x.to)):"",x.type==="aug"?Q[x.tq]+" Quarter":"",x.qty||"",x.amt,x.note||"",isCan(x)?"Cancelled":""]);
 });
 toXlsx("Budget_Monitoring_"+year+".xlsx",[
  {n:"Budget Monitoring",rows:rows,merges:headMerges(11,31,4,5,11,31),cols:cols,money:[7,9].concat(Array.apply(null,Array(21)).map(function(_,i){return 11+i})),qty:[8],from:5,to:5+list.length},
  {n:"Transactions",rows:lg,cols:[12,14,70,14,70,14,14,30],money:[6],from:1,to:lg.length}
 ]);
};

$("obPrint").onclick=function(){if(!yi().length){alert("There are no items for "+year+" to print yet.");return}paintMeta();window.print()};
$("bmPrint").onclick=function(){if(!yi().length){alert("There are no budget lines for "+year+" to print yet.");return}paintMeta();window.print()};

/* ---------- filters + dashboards ---------- */
function msFill(el,o,sel,all){
 var sig=o.map(function(x){return x.v+"\u0001"+x.t}).join("\u0002"),d=el.querySelector("details");el.dataset.all=all;
 var txt=!sel.length?all:(sel.length===1?(o.filter(function(x){return x.v===sel[0]})[0]||{t:sel[0]}).t:sel.length+" selected");
 if(d&&el._sig===sig){[].forEach.call(el.querySelectorAll("input"),function(i){i.checked=sel.indexOf(i.value)>=0});el.querySelector("summary").textContent=txt;return}
 var op=d&&d.open,b0=el.querySelector(".msb"),sc=b0?b0.scrollTop:0;el._sig=sig;
 el.innerHTML='<details'+(op?" open":"")+'><summary>'+esc(txt)+'</summary><div class="msb"><a href="#" data-msclr="1">Clear selection</a>'+o.map(function(x){return'<label><input type="checkbox" value="'+esc(x.v)+'"'+(sel.indexOf(x.v)>=0?" checked":"")+'> '+esc(x.t)+'</label>'}).join("")+'</div></details>';
 el.querySelector(".msb").scrollTop=sc;
}
function msNow(el){var c=[].filter.call(el.querySelectorAll("input"),function(i){return i.checked});el.querySelector("summary").textContent=!c.length?(el.dataset.all||"All"):(c.length===1?c[0].parentNode.textContent.trim():c.length+" selected")}
var _lt;function later(fn){clearTimeout(_lt);_lt=setTimeout(fn,160)}
function msVal(el){return[].map.call(el.querySelectorAll("input:checked"),function(i){return i.value})}
function msClear(e){var c=e.target.closest("[data-msclr]");if(!c)return null;e.preventDefault();return c.closest(".ms")}
document.addEventListener("click",function(e){[].forEach.call(document.querySelectorAll(".ms details[open]"),function(d){if(!d.parentNode.contains(e.target))d.open=false})});
function L1(a){return a.map(function(v){return{v:v,t:v}})}
function QO(){return Q.map(function(n,i){return{v:String(i),t:n+" Quarter"}})}
function qsOf(a){return a.length?a.map(Number).sort():[0,1,2,3]}
function qtxt(a){return a.map(function(k){return Q[+k]+" Quarter"})}
var FS={ob:{act:[],obj:[],mode:[],q:[]},bm:{act:[],obj:[],mode:[],q:[]}},MODES=["Procurement","Non-Procurement"];
function modeSet(v){$("mode").value=v||"";return;var s=$("mode");if(v&&![].some.call(s.options,function(o){return o.value===v})){var o=document.createElement("option");o.value=o.textContent=v;s.appendChild(o)}s.value=v||""}
function fi(w){var f=FS[w];return yi().filter(function(it){return(!f.act.length||f.act.indexOf(it.act)>=0)&&(!f.obj.length||f.obj.indexOf(it.obj)>=0)&&(!f.mode.length||f.mode.indexOf(it.mode||"")>=0)&&(!f.q.length||f.q.some(function(k){return it.q[+k]>0}))})}
function uniq(a){return a.filter(function(v,i){return v&&a.indexOf(v)===i}).sort()}
function opts(vals,sel,all){var h='<option value="">'+all+'</option>';vals.forEach(function(v){h+='<option value="'+esc(v)+'"'+(v===sel?" selected":"")+'>'+esc(v)+'</option>'});return h}
function fillStock(){var u=uniq(items.map(function(i){return i.stock}).filter(function(s){return s!=="N/A"}));$("stockList").innerHTML='<option value="N/A">'+u.map(function(s){return'<option value="'+esc(s)+'">'}).join("")}
function buildBar(w){
 var el=$(w+"Dash");
 el.innerHTML='<h2 style="margin:0 0 10px">'+(w==="ob"?"Office Budget":"Budget Monitoring")+' dashboard</h2><div class="fbar"><div><label>Activities</label><div class="ms" data-f="act"></div></div><div><label>Object of Expenditure</label><div class="ms" data-f="obj"></div></div><div><label>Mode of Procurement</label><div class="ms" data-f="mode"></div></div><div><label>Quarter</label><div class="ms" data-f="q"></div></div><button data-clr="1">Clear filters</button></div><div class="fsum"></div><div class="kpis"></div><div class="dtw"></div>';
 el.addEventListener("change",function(e){var b=e.target.closest(".ms");if(!b||!b.dataset.f)return;var k=b.dataset.f;FS[w][k]=msVal(b);msNow(b);later(function(){if(k==="act"){FS[w].obj=[];FS[w].mode=[]}fillFilters(w);if(w==="ob")renderOB();else renderBM();renderDash(w)})});
 el.addEventListener("click",function(e){var mc=msClear(e);if(mc){var k=mc.dataset.f;FS[w][k]=[];if(k==="act"){FS[w].obj=[];FS[w].mode=[]}fillFilters(w);if(w==="ob")renderOB();else renderBM();renderDash(w);return}if(e.target.dataset.clr){FS[w]={act:[],obj:[],mode:[],q:[]};fillFilters(w);if(w==="ob")renderOB();else renderBM();renderDash(w)}});
}
function fillFilters(w){
 var f=FS[w],all=yi(),acts=uniq(all.map(function(i){return i.act}));
 f.act=f.act.filter(function(a){return acts.indexOf(a)>=0});
 var inA=all.filter(function(i){return!f.act.length||f.act.indexOf(i.act)>=0}),objs=uniq(inA.map(function(i){return i.obj})).sort(byObj),ms=uniq(MODES.concat(inA.map(function(i){return i.mode})));
 f.obj=f.obj.filter(function(o){return objs.indexOf(o)>=0});f.mode=f.mode.filter(function(m){return ms.indexOf(m)>=0});
 var s=function(k){return $(w+"Dash").querySelector('[data-f="'+k+'"]')};
 msFill(s("act"),L1(acts),f.act,"All activities");msFill(s("obj"),L1(objs),f.obj,"All objects of expenditure");msFill(s("mode"),L1(ms),f.mode,"All modes");msFill(s("q"),QO(),f.q,"All quarters");
}
function sumL(list,qs){
 var o={n:0,qty:0,b:0,r:0,t:0,f:0,bal:0};
 list.forEach(function(it){var c=lineCalc(it),q=0;qs.forEach(function(k){q+=it.q[k];o.b+=c.b[k];o.r+=c.r[k];o.t+=c.t[k];o.f+=c.f[k];o.bal+=c.bal[k]});o.qty+=q;if(q>0)o.n++});
 return o;
}
function renderDash(w){
 var f=FS[w],list=fi(w),qs=qsOf(f.q),bm=w==="bm",el=$(w+"Dash"),T=sumL(list,qs),h="";
 var card=function(l,v,c){return'<div class="kpi"><span>'+l+'</span><b'+(c?' class="'+c+'"':"")+'>'+v+'</b></div>'},p=function(v){return"₱ "+money(v)};
 if(!bm){
  var pr=sumL(list.filter(function(i){return i.mode==="Procurement"}),qs),np=sumL(list.filter(function(i){return i.mode==="Non-Procurement"}),qs);
  h=card("Items",T.n)+card("Total quantity",qty(T.qty))+card("Estimated budget",p(T.b))+card("Procurement",p(pr.b))+card("Non-Procurement",p(np.b))+(function(){var o=overWfp(list,qs);return card("Items over WFP",p(o.amt)+" \u00b7 "+o.n+(o.n===1?" case":" cases"),o.n?"neg":"")})();
 }else h=card("Budget",p(T.b))+card("Released",p(T.r))+card("Augmented from (taken out)",p(T.t))+card("Augmented to (added)",p(T.f))+card("Balance",p(T.bal),T.bal<-0.005?"neg":"")+card("% released",T.b?(T.r/T.b*100).toFixed(1)+"%":"–")+(function(){var cn=txs.filter(function(x){var s0=byId(x.from);return s0&&list.indexOf(s0)>=0&&qs.indexOf(x.fq)>=0&&isCan(x)});return card("Cancelled transactions",p(cn.reduce(function(a,x){return a+x.amt},0))+" · "+cn.length,cn.length?"neg":"")})()+(function(){var o=overWfp(list,qs);return card("Items over WFP",p(o.amt)+" \u00b7 "+o.n+(o.n===1?" case":" cases"),o.n?"neg":"")})();

 var cols=bm?["Budget","Released","Balance"]:["Items","Quantity","Amount"];
 var row=function(l,s){return"<tr><td>"+esc(l)+"</td>"+(bm?"<td class='n'>"+money(s.b)+"</td><td class='n'>"+money(s.r)+"</td><td class='n'>"+money(s.bal)+"</td>":"<td class='n'>"+s.n+"</td><td class='n'>"+qty(s.qty)+"</td><td class='n'>"+money(s.b)+"</td>")+"</tr>"};
 var tbl=function(t,first,rows){return"<div><h3>"+t+"</h3><table class='dt'><thead><tr><th>"+first+"</th>"+cols.map(function(c){return"<th>"+c+"</th>"}).join("")+"</tr></thead><tbody>"+rows+"</tbody><tfoot>"+row("TOTAL",T)+"</tfoot></table></div>"};
 var qr=qs.map(function(k){return row(Q[k]+" Quarter",sumL(list,[k]))}).join("");
 var or=uniq(list.map(function(i){return i.obj})).sort(byObj).map(function(o){return row(o,sumL(list.filter(function(i){return i.obj===o}),qs))}).join("");
 el.querySelector(".kpis").innerHTML=h;
 el.querySelector(".dtw").innerHTML=tbl("Per quarter","Quarter",qr||"<tr><td colspan='4' class='empty'>No data</td></tr>")+tbl("Per Object of Expenditure","Object of Expenditure",or||"<tr><td colspan='4' class='empty'>No data</td></tr>");
 var on=[].concat(f.act,f.obj,f.mode,qtxt(f.q));
 el.querySelector(".fsum").textContent="Showing "+list.length+" of "+yi().length+" items"+(on.length?" — filtered by: "+on.join(" › "):"");
}
function renderAll(){renderWF();renderAN();if(typeof renderAL==="function"&&$("alDash").firstChild)renderAL();fillStock();["ob","bm"].forEach(fillFilters);renderOB();fillTx();renderBM();paintMeta();renderDash("ob");renderDash("bm")}
buildBar("ob");buildBar("bm");
/* ---------- Objects of Expenditure: editable + sorted by account code ---------- */
function oc(n){return codeOf(n)||"~"}
function byObj(a,b){return oc(a).localeCompare(oc(b),undefined,{numeric:true})||(a<b?-1:1)}
function afterObjChange(){fillObj($("obj").value);renderAll()}
function objMgr(){
 var h='<h3 style="margin-top:0">Objects of Expenditure</h3><p class="fsum">Change the account code or name, then press Save on that row. Renaming also updates your existing items and WFP entries. The list is sorted by account code.</p><div style="max-height:60vh;overflow:auto"><table class="dt"><thead><tr><th>Account Code</th><th>Object of Expenditure</th><th></th></tr></thead><tbody><tr><td><input data-n="c" placeholder="New code"></td><td><input data-n="n" placeholder="New object name"></td><td><button data-a="add">Add</button></td></tr>';
 allObj().forEach(function(o){h+='<tr data-o="'+esc(o[0])+'"><td><input data-f="c" value="'+esc(o[0])+'"></td><td><input data-f="n" value="'+esc(o[1])+'"></td><td style="white-space:nowrap"><button data-a="save">Save</button> <button class="d" data-a="del">Delete</button></td></tr>'});
 $("objDlg").innerHTML=h+'</tbody></table></div><div style="margin-top:10px;text-align:right"><button data-a="close">Close</button></div>';
}
$("objDlg").addEventListener("close",afterObjChange);
$("objEdit").onclick=function(e){e.preventDefault();objMgr();$("objDlg").showModal()};
$("objDlg").addEventListener("click",function(e){
 var a=e.target.dataset.a;if(!a)return;
 if(a==="close"){$("objDlg").close();return}
 var tr=e.target.closest("tr"),val=function(k){return tr.querySelector('[data-'+(tr.dataset.o?"f":"n")+'="'+k+'"]').value.trim()};
 var used=function(n){return items.some(function(i){return i.obj===n})||alloc.some(function(r){return r.obj===n})};
 if(a==="add"){
  var c=val("c"),n=val("n");if(!c||!n){alert("Enter both the account code and the name.");return}
  if(allObj().some(function(o){return o[0]===c||o[1].toLowerCase()===n.toLowerCase()})){alert("That account code or name already exists.");return}
  custom.push([c,n]);save(OBJKEY,custom);objMgr();return;
 }
 var oldC=tr.dataset.o,ent=custom.filter(function(o){return o[0]===oldC})[0];if(!ent)return;
 if(a==="del"){
  if(used(ent[1])){alert("\""+ent[1]+"\" is used by existing items or WFP entries, so it can't be deleted. Rename it instead.");return}
  if(!confirm("Delete \""+ent[1]+"\" from the list?"))return;
  custom.splice(custom.indexOf(ent),1);save(OBJKEY,custom);tr.remove();return;
 }
 var nc=val("c"),nn=val("n");if(!nc||!nn){alert("The account code and name can't be empty.");return}
 if(allObj().some(function(o){return o!==ent&&(o[0]===nc||o[1].toLowerCase()===nn.toLowerCase())})){alert("Another object already uses that account code or name.");return}
 var oldN=ent[1];ent[0]=nc;ent[1]=nn;save(OBJKEY,custom);
 items.forEach(function(i){if(i.obj===oldN){i.obj=nn;i.acct=nc}});alloc.forEach(function(r){if(r.obj===oldN)r.obj=nn});
 save(KEY,items);save(ALK,alloc);tr.dataset.o=nc;e.target.textContent="Saved ✓";setTimeout(function(){e.target.textContent="Save"},1200);
});

/* ---------- Allocation vs Budget ---------- */
var AF={act:[],obj:[],q:[]},alEdit=null,ALR=[];
function alCalc(){var s=0;[1,2,3,4].forEach(function(i){s+=parseFloat($("al"+i).value)||0});$("alTot").value=money(s)}
function alClear(){["alAct","alObj","al1","al2","al3","al4"].forEach(function(i){$(i).value=""});alEdit=null;$("alTitle").textContent="Add WFP entry";$("alSave").textContent="Add WFP entry";$("alCancel").classList.add("hidden");$("alErr").textContent="";alCalc()}
[1,2,3,4].forEach(function(i){$("al"+i).addEventListener("input",alCalc)});$("alCancel").onclick=alClear;
$("alSave").onclick=function(){
 var act=$("alAct").value.trim(),on=$("alObj").value.trim(),hit=allObj().filter(function(o){return o[1].toLowerCase()===on.toLowerCase()})[0],q=[1,2,3,4].map(function(i){return parseFloat($("al"+i).value)||0}),e=$("alErr");
 if(!act){e.textContent="Enter the Activity.";return}
 if(!hit){e.textContent="Select an Object of Expenditure from the list.";return}
 if(q.some(function(x){return x<0})||!q.some(function(x){return x>0})){e.textContent="Enter a WFP amount for at least one quarter.";return}
 var same=alloc.filter(function(r){return +r.year===year&&r.act===act&&r.obj===hit[1]&&r.id!==alEdit})[0];
 if(same){if(!confirm("A WFP entry for this activity and object already exists. Replace it?"))return;alloc=alloc.filter(function(r){return r!==same})}
 if(alEdit){var o=alloc.filter(function(r){return r.id===alEdit})[0];if(o){o.act=act;o.obj=hit[1];o.q=q}}else alloc.push({id:uid(),year:year,act:act,obj:hit[1],q:q});
 save(ALK,alloc);alClear();renderAll();
};
function wfLoad(r){showBody("al");alEdit=r.id;$("alAct").value=r.act;$("alObj").value=r.obj;[0,1,2,3].forEach(function(k){$("al"+(k+1)).value=r.q[k]||""});$("alTitle").textContent="Edit WFP entry";$("alSave").textContent="Save changes";$("alCancel").classList.remove("hidden");alCalc();window.scrollTo(0,0)}
var WFF={act:[],obj:[],q:[]},WFN=0;
function wfFill(all){
 var acts=uniq(all.map(function(r){return r.act}));WFF.act=WFF.act.filter(function(a){return acts.indexOf(a)>=0});
 var objs=uniq(all.filter(function(r){return!WFF.act.length||WFF.act.indexOf(r.act)>=0}).map(function(r){return r.obj})).sort(byObj);WFF.obj=WFF.obj.filter(function(o){return objs.indexOf(o)>=0});
 var f=$("wfFilt"),g=function(k){return f.querySelector('[data-wf="'+k+'"]')};
 msFill(g("act"),L1(acts),WFF.act,"All activities");msFill(g("obj"),L1(objs),WFF.obj,"All objects of expenditure");msFill(g("q"),QO(),WFF.q,"All quarters");
}
$("wfFilt").addEventListener("change",function(e){var b=e.target.closest(".ms");if(!b||!b.dataset.wf)return;var k=b.dataset.wf;WFF[k]=msVal(b);msNow(b);later(function(){if(k==="act")WFF.obj=[];renderWF()})});
$("wfPrint").onclick=function(){if(!WFN){alert("There are no WFP entries to print. Check your filters.");return}paintMeta();window.print()};
$("wfFilt").addEventListener("click",function(e){var mc=msClear(e);if(mc){var k=mc.dataset.wf;WFF[k]=[];if(k==="act")WFF.obj=[];renderWF();return}if(e.target.dataset.wclr){WFF={act:[],obj:[],q:[]};renderWF()}});
function renderWF(){
 var all=alloc.filter(function(r){return+r.year===year});wfFill(all);
 var rows=all.filter(function(r){return(!WFF.act.length||WFF.act.indexOf(r.act)>=0)&&(!WFF.obj.length||WFF.obj.indexOf(r.obj)>=0)&&(!WFF.q.length||WFF.q.some(function(k){return r.q[+k]>0}))}).sort(function(a,b){return a.act.localeCompare(b.act)||byObj(a.obj,b.obj)}),T=[0,0,0,0],sm=function(v){return v.reduce(function(a,b){return a+b},0)};
 var h="<thead><tr><th>Activity</th><th>Object of Expenditure</th><th>Account Code</th><th>1st Quarter</th><th>2nd Quarter</th><th>3rd Quarter</th><th>4th Quarter</th><th>Total</th><th class='act'></th></tr></thead><tbody>";
 rows.forEach(function(r){r.q.forEach(function(v,k){T[k]+=v});h+="<tr><td>"+esc(r.act)+"</td><td>"+esc(r.obj)+"</td><td>"+esc(codeOf(r.obj))+"</td>"+r.q.map(function(v){return"<td class='n'>"+(v?money(v):"")+"</td>"}).join("")+"<td class='n'><b>"+money(sm(r.q))+"</b></td><td class='act' style='white-space:nowrap'><button data-w='e' data-id='"+r.id+"'>Edit</button><button class='d' data-w='d' data-id='"+r.id+"'>Delete</button></td></tr>"});
 h+=rows.length?"</tbody><tfoot><tr style='font-weight:700;background:var(--soft)'><td colspan='3'>TOTAL</td>"+T.map(function(v){return"<td class='n'>"+money(v)+"</td>"}).join("")+"<td class='n'>"+money(sm(T))+"</td><td class='act'></td></tr></tfoot>":"<tr><td colspan='9' class='empty'>"+(all.length?"No WFP entries match the filters.":"No WFP entries for "+year+" yet.")+"</td></tr></tbody>";
 $("wfTbl").innerHTML=h;WFN=rows.length;var on=[].concat(WFF.act,WFF.obj,qtxt(WFF.q));$("wfSum").textContent="Showing "+rows.length+" of "+all.length+" entries for "+year+(on.length?" — filtered by: "+on.join(" › "):"");
}
$("wfTbl").addEventListener("click",function(e){var b=e.target.closest("button");if(!b||!b.dataset.w)return;var r=alloc.filter(function(x){return x.id===b.dataset.id})[0];if(!r)return;
 if(b.dataset.w==="e")wfLoad(r);else if(confirm("Delete this WFP entry?")){alloc=alloc.filter(function(x){return x.id!==r.id});save(ALK,alloc);if(alEdit===r.id)alClear();renderAll()}});
function wfpChk(act,obj,q,ex){
 var keep=txs;if(ex)txs=txs.filter(function(t){return t.id!==ex});
 var w=0,sp=0;alloc.forEach(function(r){if(+r.year===year&&r.act===act&&r.obj===obj)w+=r.q[q]});
 yi().forEach(function(it){if(it.act===act&&it.obj===obj)sp+=lineCalc(it).r[q]});
 txs=keep;return{w:w,sp:sp}}
function alRows(){
 var m={},f=AF;
 var g=function(a,o){var k=a+"\u0001"+o;return m[k]||(m[k]={act:a,obj:o,a:[0,0,0,0],b:[0,0,0,0],s:[0,0,0,0],id:""})};
 alloc.filter(function(r){return +r.year===year}).forEach(function(r){var x=g(r.act,r.obj);x.id=r.id;for(var k=0;k<4;k++)x.a[k]+=r.q[k]});
 yi().forEach(function(it){var x=g(it.act,it.obj),c=lineCalc(it);for(var k=0;k<4;k++){x.b[k]+=c.b[k];x.s[k]+=c.r[k]}});
 return Object.keys(m).map(function(k){return m[k]}).filter(function(r){return(!f.act.length||f.act.indexOf(r.act)>=0)&&(!f.obj.length||f.obj.indexOf(r.obj)>=0)}).sort(function(x,y){return x.act.localeCompare(y.act)||byObj(x.obj,y.obj)});
}
var GR=[["Allocated","a"],["Budgeted","b"],["Actual spent","s"],["Allocation − Budgeted","d1"],["Budgeted − Spent","d2"],["Allocation − Spent","d3"]];
function dv(r){return{a:r.a,b:r.b,s:r.s,d1:r.a.map(function(x,k){return x-r.b[k]}),d2:r.b.map(function(x,k){return x-r.s[k]}),d3:r.a.map(function(x,k){return x-r.s[k]})}}
function buildAL(){
 $("alDash").innerHTML='<div class="bar"><h2 style="margin:0">Work Financial Plan (WFP) vs Actual Budget</h2><button class="p" id="alXls">Save to Excel</button></div><div class="fbar" style="margin-top:10px"><div><label>Activities</label><div class="ms" data-f="act"></div></div><div><label>Object of Expenditure</label><div class="ms" data-f="obj"></div></div><div><label>Quarter</label><div class="ms" data-f="q"></div></div><button data-clr="1">Clear filters</button></div><div class="fsum"></div><div id="alC1"></div><div id="alC2"></div>';
 var el=$("alDash");
 el.addEventListener("change",function(e){var b=e.target.closest(".ms");if(!b||!b.dataset.f)return;var k=b.dataset.f;AF[k]=msVal(b);msNow(b);later(function(){if(k==="act")AF.obj=[];renderAL()})});
 el.addEventListener("click",function(e){
  var t=e.target;
  var mc=msClear(e);if(mc){AF[mc.dataset.f]=[];if(mc.dataset.f==="act")AF.obj=[];renderAL();return}if(t.dataset.clr){AF={act:[],obj:[],q:[]};renderAL();return}
  if(t.id==="alXls"){alXls();return}
  var r=ALR[t.dataset.i];if(!r)return;
  if(t.dataset.k==="d"){if(confirm("Delete this WFP entry?")){alloc=alloc.filter(function(x){return x.id!==r.id});save(ALK,alloc);renderAll()}return}
  alEdit=t.dataset.k==="e"?r.id:null;$("alAct").value=r.act;$("alObj").value=r.obj;
  [0,1,2,3].forEach(function(k){$("al"+(k+1)).value=(t.dataset.k==="e"&&r.a[k])?r.a[k]:""});
  $("alTitle").textContent=alEdit?"Edit WFP entry":"Add WFP entry";$("alSave").textContent=alEdit?"Save changes":"Add WFP entry";$("alCancel").classList.toggle("hidden",!alEdit);alCalc();tab("WF");window.scrollTo(0,0);
 });
}
function cmp(host,title,la,ka,lb,kb,pct,rows,qs,withAct){
 var sum=function(arr){return qs.reduce(function(s,i){return s+arr[i]},0)},A=0,B=0;
 rows.forEach(function(r){A+=sum(r[ka]);B+=sum(r[kb])});
 var p=function(v){return"₱ "+money(v)},card=function(l,v,c){return'<div class="kpi"><span>'+l+'</span><b class="'+(c||"")+'">'+v+'</b></div>'},ng=function(v){return v<-0.005?"neg":""};
 var kp='<div class="kpis">'+card(la,p(A))+card(lb,p(B))+card(la+" − "+lb,p(A-B),ng(A-B))+card(pct,A?(B/A*100).toFixed(1)+"%":"–")+'</div>';
 var row=function(l,a,b,bold){var d=a-b;return"<tr"+(bold?" style='font-weight:700;background:var(--soft)'":"")+"><td>"+esc(l)+"</td><td class='n'>"+money(a)+"</td><td class='n'>"+money(b)+"</td><td class='n "+ng(d)+"'>"+money(d)+"</td></tr>"};
 var tb=function(t,first,body){return"<div><h4>"+t+"</h4><table class='dt'><thead><tr><th>"+first+"</th><th>"+la+"</th><th>"+lb+"</th><th>"+la+" − "+lb+"</th></tr></thead><tbody>"+body+"</tbody><tfoot>"+row("TOTAL",A,B,1)+"</tfoot></table></div>"};
 var qr=qs.map(function(k){var a=0,b=0;rows.forEach(function(r){a+=r[ka][k];b+=r[kb][k]});return row(Q[k]+" Quarter",a,b)}).join("");
 var grp=function(key,keys){return keys.map(function(v){var a=0,b=0;rows.forEach(function(r){if(r[key]===v){a+=sum(r[ka]);b+=sum(r[kb])}});return row(v,a,b)}).join("")};
 var tabs='<div class="dtw">'+tb("Per quarter","Quarter",qr)+tb("Per Object of Expenditure","Object of Expenditure",grp("obj",uniq(rows.map(function(r){return r.obj})).sort(byObj)))+tb("Per activity","Activity",grp("act",uniq(rows.map(function(r){return r.act}))))+'</div>';
 var G=[[la,ka],[lb,kb],[la+" − "+lb,"d"]],H="<thead><tr><th rowspan='2'>Activity</th><th rowspan='2'>Object of Expenditure</th>"+G.map(function(x){return"<th colspan='5' style='text-align:center'>"+x[0]+"</th>"}).join("")+(withAct?"<th rowspan='2'></th>":"")+"</tr><tr>"+G.map(function(){return"<th>1st</th><th>2nd</th><th>3rd</th><th>4th</th><th>Total</th>"}).join("")+"</tr></thead>";
 var cells=function(v,neg){return v.concat([v.reduce(function(x,y){return x+y},0)]).map(function(n){return"<td class='n"+(neg&&n<-0.005?" neg":"")+"'>"+((n||neg)?money(n):"")+"</td>"}).join("")},TA=[0,0,0,0],TB=[0,0,0,0],bd="";
 var diff=function(a,b){return a.map(function(x,k){return x-b[k]})};
 rows.forEach(function(r,i){for(var k=0;k<4;k++){TA[k]+=r[ka][k];TB[k]+=r[kb][k]}
  bd+="<tr><td>"+esc(r.act)+"</td><td>"+esc(r.obj)+"</td>"+cells(r[ka])+cells(r[kb])+cells(diff(r[ka],r[kb]),1)+(withAct?"<td style='white-space:nowrap'>"+(r.id?"<button data-k='e' data-i='"+i+"'>Edit</button><button class='d' data-k='d' data-i='"+i+"'>Delete</button>":"<button data-k='n' data-i='"+i+"'>Set WFP</button>")+"</td>":"")+"</tr>"});
 var det="<h4>Per activity and object of expenditure</h4><div style='overflow-x:auto'><table class='dt'>"+H+"<tbody>"+(bd||"<tr><td colspan='18' class='empty'>No data for "+year+" yet.</td></tr>")+"</tbody>"+(bd?"<tfoot><tr style='font-weight:700;background:var(--soft)'><td colspan='2'>TOTAL</td>"+cells(TA)+cells(TB)+cells(diff(TA,TB),1)+(withAct?"<td></td>":"")+"</tr></tfoot>":"")+"</table></div>";
 host.innerHTML="<h3 style='margin:22px 0 4px;color:var(--brand2);border-top:2px solid var(--line);padding-top:12px'>"+title+"</h3>"+kp+tabs+det;
}
function renderAL(){
 var el=$("alDash"),f=AF,rows=alRows(),qs=qsOf(f.q);ALR=rows;
 var acts=uniq(alloc.filter(function(r){return+r.year===year}).map(function(r){return r.act}).concat(yi().map(function(i){return i.act})));
 var all=(function(){var s=AF;AF={act:f.act,obj:[],q:[]};var r=alRows();AF=s;return r})();
 var objs=uniq(all.map(function(r){return r.obj})).sort(byObj);f.obj=f.obj.filter(function(o){return objs.indexOf(o)>=0});
 var s=function(k){return el.querySelector('[data-f="'+k+'"]')};
 msFill(s("act"),L1(acts),f.act,"All activities");msFill(s("obj"),L1(objs),f.obj,"All objects of expenditure");msFill(s("q"),QO(),f.q,"All quarters");
 cmp($("alC1"),"Comparison 1: Work Financial Plan (WFP) vs Actual Budget Allocated","WFP","a","Actual Budget Allocated","b","% of WFP allocated",rows,qs,true);
 cmp($("alC2"),"Comparison 2: Actual Budget Allocated vs Actual Budget Spent","Actual Budget Allocated","b","Actual Budget Spent","s","% of allocated budget spent",rows,qs,false);
 var on=[].concat(f.act,f.obj,qtxt(f.q));
 el.querySelector(".fsum").textContent="Year "+year+" — WFP = the lump-sum Work Financial Plan; Actual Budget Allocated = your encoded items (quantity × unit price); Actual Budget Spent = Release recorded in Budget Monitoring. A red balance means the second amount is more than the first"+(on.length?". Filtered by: "+on.join(" › "):"");
 var dl="";acts.forEach(function(a){dl+='<option value="'+esc(a)+'"></option>'});$("alActList").innerHTML=dl;
}
function alXls(){
 if(!needX())return;var r=alRows();if(!r.length){alert("Nothing to export.");return}
 var G=[["WFP","a"],["Actual Budget Allocated","b"],["Actual Budget Spent","s"],["WFP − Allocated","d1"],["Allocated − Spent","d2"]],t=function(v){return v.concat([v.reduce(function(p,c){return p+c},0)])};
 var a=[["Activity","Object of Expenditure"].concat(G.reduce(function(x,g){return x.concat(["1st","2nd","3rd","4th","Total"].map(function(q){return g[0]+" "+q}))},[]))];
 r.forEach(function(x){var d={a:x.a,b:x.b,s:x.s,d1:x.a.map(function(v,k){return v-x.b[k]}),d2:x.b.map(function(v,k){return v-x.s[k]})};a.push([x.act,x.obj].concat.apply([],G.map(function(g){return t(d[g[1]])})))});
 var ws=XLSX.utils.aoa_to_sheet(a);ws["!cols"]=[{wch:40},{wch:36}].concat(a[0].slice(2).map(function(){return{wch:14}}));
 var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"WFP vs Actual "+year);XLSX.writeFile(wb,"wfp-vs-actual-"+year+".xlsx");
}
buildAL();


/* ---------- Hide / Show forms + Office Annual Budget (CRUD) ---------- */
var annual=load(ANK,[]),anEdit=null;
function setHide(p,h){$(p+"Body").classList.toggle("hidden",h);$(p+"Hide").textContent=h?"Show":"Hide"}
function showBody(p){setHide(p,false)}
function toggleBody(p){setHide(p,!$(p+"Body").classList.contains("hidden"))}
$("alHide").onclick=function(){toggleBody("al")};$("anHide").onclick=function(){toggleBody("an")};
function anCalc(){$("anTot").value=money((+$("anTour").value||0)+(+$("anArw").value||0))}
function anClear(){anEdit=null;$("anYear").value=year;$("anTour").value=$("anArw").value=$("anTheme").value="";anCalc();$("anTitle").textContent="Add Office Annual Budget";$("anSave").textContent="Add record";$("anCancel").classList.add("hidden");$("anErr").textContent=""}
$("anTour").oninput=$("anArw").oninput=anCalc;$("anCancel").onclick=anClear;
$("anSave").onclick=function(){
 var y=parseInt($("anYear").value,10),t=+$("anTour").value||0,a=+$("anArw").value||0,th=$("anTheme").value.trim(),e=$("anErr");
 if(!(y>=2000&&y<=2100)){e.textContent="Enter a valid year (2000 to 2100).";return}
 if(t<0||a<0){e.textContent="Budget amounts cannot be negative.";return}
 if(annual.some(function(r){return r.year===y&&r.id!==anEdit})){e.textContent="A record for "+y+" already exists. Edit that record instead.";return}
 if(anEdit)annual=annual.map(function(r){return r.id===anEdit?{id:r.id,year:y,tourism:t,arawatan:a,theme:th}:r});
 else annual.push({id:uid(),year:y,tourism:t,arawatan:a,theme:th});
 save(ANK,annual);anClear();renderAN()};
function renderAN(){
 var rows=(annual||[]).slice().sort(function(a,b){return b.year-a.year});
 $("anTbl").innerHTML='<thead><tr><th>Year</th><th>Tourism Budget</th><th>Arawatan Budget</th><th>Total</th><th>Arawatan Festival Theme</th><th class="act">Actions</th></tr></thead><tbody>'+
 (rows.map(function(r){return'<tr><td class="c">'+r.year+'</td><td class="n">'+money(r.tourism)+'</td><td class="n">'+money(r.arawatan)+'</td><td class="n"><b>'+money(r.tourism+r.arawatan)+'</b></td><td>'+esc(r.theme)+'</td><td class="act"><button data-k="e" data-id="'+r.id+'">Edit</button> <button class="d" data-k="d" data-id="'+r.id+'">Delete</button></td></tr>'}).join("")||'<tr><td colspan="6" class="empty">No records yet. Add one above.</td></tr>')+'</tbody>'}
$("anTbl").onclick=function(e){var b=e.target.closest("button");if(!b)return;var r=annual.filter(function(x){return x.id===b.dataset.id})[0];if(!r)return;
 if(b.dataset.k==="d"){if(confirm("Delete the Office Annual Budget record for "+r.year+"?")){annual=annual.filter(function(x){return x.id!==r.id});save(ANK,annual);if(anEdit===r.id)anClear();renderAN()}return}
 showBody("an");anEdit=r.id;$("anYear").value=r.year;$("anTour").value=r.tourism;$("anArw").value=r.arawatan;$("anTheme").value=r.theme;anCalc();
 $("anTitle").textContent="Edit Office Annual Budget";$("anSave").textContent="Update record";$("anCancel").classList.remove("hidden");$("anErr").textContent="";$("anYear").scrollIntoView({block:"center"})};
$("anPrint").onclick=function(){if(!annual.length){alert("There are no records to print.");return}window.print()};
anClear();
fillYear();fillObj("");calcForm();typeUi();refreshLists();renderAll();

/* ---------- load from cloud on open ---------- */
function applyCloud(d){
 CLOUD_KEYS.forEach(function(k){if(d[k]&&d[k]!=="null")try{localStorage.setItem(k,d[k])}catch(e){}});
 items=load(KEY,[]);txs=load(TXK,[]);meta=load(META,{});years=load(YK,[]);custom=load(OBJKEY,[]);alloc=load(ALK,[]);annual=load(ANK,[]);objInit();
 items.forEach(function(it){if(!it.id)it.id=uid();if(!it.year)it.year=+meta.year||thisYear;if(years.indexOf(+it.year)<0)years.push(+it.year)});
 if(years.indexOf(year)<0)years.push(year);
 Object.keys(mm).forEach(function(id){$(id).value=meta[mm[id]]||""});
 fillYear();fillObj("");clearForm();renderAll();
}
$("bkDown").onclick=function(){var o={};CLOUD_KEYS.forEach(function(k){o[k]=localStorage.getItem(k)});var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(o)],{type:"application/json"}));a.download="wfp-backup-"+new Date().toISOString().slice(0,10)+".json";a.click()};
$("bkUp").onclick=function(){$("bkFile").click()};
$("bkFile").onchange=function(){var f=this.files[0];if(!f)return;var r=new FileReader();r.onload=function(){try{var o=JSON.parse(r.result);if(!confirm("Replace the data on this device with this backup and upload it to the cloud?"))return;CLOUD_KEYS.forEach(function(k){if(o[k])localStorage.setItem(k,o[k])});localStorage.setItem(DIRTY,"1");localStorage.setItem(MERGED,"1");location.reload()}catch(e){alert("That file is not a valid backup.")}};r.readAsText(f)};
booted=true;
if(docRef){
 docRef.get().then(function(snap){
  var d=snap.exists?snap.data():null,first=localStorage.getItem(MERGED)!=="1",dirty=localStorage.getItem(DIRTY)==="1";
  var cloudEmpty=!d||!d[KEY]||d[KEY]==="null"||d[KEY]==="[]";
  if(d&&first&&!cloudEmpty){ /* first open of this version on this device: combine, never discard */
   var P=function(v){try{var x=JSON.parse(v);return x==null?[]:x}catch(e){return[]}},m=function(a,b,id){var seen={};a.forEach(function(x){seen[id(x)]=1});return a.concat(b.filter(function(x){return!seen[id(x)]}))};
   var L=function(k){return P(localStorage.getItem(k))},C=function(k){return P(d[k])},idf=function(x){return x.id};
   var o={};o[KEY]=JSON.stringify(m(L(KEY),C(KEY),idf));o[TXK]=JSON.stringify(m(L(TXK),C(TXK),idf));
   o[YK]=JSON.stringify(m(L(YK),C(YK),String));o[OBJKEY]=JSON.stringify(m(L(OBJKEY),C(OBJKEY),function(x){return x[0]}));o[ALK]=JSON.stringify(m(L(ALK),C(ALK),idf));o[ANK]=JSON.stringify(m(L(ANK),C(ANK),idf));
   var lm=localStorage.getItem(META);o[META]=(lm&&lm!=="{}"&&lm!=="null")?lm:(d[META]||"{}");
   applyCloud(o);localStorage.setItem(MERGED,"1");cloudReady=true;pushCloud();
  }else if(d&&!cloudEmpty&&!dirty){applyCloud(d);localStorage.setItem(MERGED,"1");cloudReady=true;setBadge("☁ Synced","ok")}
  else{localStorage.setItem(MERGED,"1");cloudReady=true;pushCloud()} /* cloud empty, or unsynced edits on this device */
 }).catch(function(){setBadge("☁ Offline (saved on this device only)","bad")});
}
})();
