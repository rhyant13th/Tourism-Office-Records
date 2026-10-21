window.APP_VER="r12 • Items (Description) list per year, WFP entry by Object of Expenditure";(function(){var v=document.createElement("div");v.id="appVer";v.className="noprint";v.textContent="App version: "+window.APP_VER;v.style.cssText="position:fixed;left:8px;bottom:6px;font:11px system-ui,sans-serif;color:#64748b;z-index:5;background:rgba(255,255,255,.85);padding:1px 6px;border-radius:6px";document.body.appendChild(v)})();

(function(){
var $=function(id){return document.getElementById(id)};
var KEY="procurement_plan_v1",META="procurement_plan_meta_v1",TXK="procurement_tx_v1",YK="procurement_years_v1",CY="procurement_year_cur_v1",OBJKEY="procurement_objs_v1",ALK="procurement_alloc_v1",ANK="procurement_annual_v1",CATK="procurement_catalog_v1";
function load(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}}
/* ---------- Firebase (cloud backup + sync) ---------- */
var firebaseConfig=window.FIREBASE_CONFIG;
var CLOUD_KEYS=["procurement_plan_v1","procurement_plan_meta_v1","procurement_tx_v1","procurement_years_v1","procurement_objs_v1","procurement_alloc_v1","procurement_annual_v1","procurement_catalog_v1"],DIRTY="procurement_dirty_v1",MERGED="procurement_merged_v1";
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
/* ---------- Excel-like hover tooltip for Budget Monitoring ---------- */
var bmTip=(function(){
  var d=document.createElement("div");d.id="bmTip";document.body.appendChild(d);
  var cur=null,timer=null,inside=false,scrollLock=false;
  function cancel(){if(timer){clearTimeout(timer);timer=null}}
  function hide(){if(inside||scrollLock)return;cancel();cur=null;d.style.display="none"}
  function arm(){cancel();timer=setTimeout(hide,700)}
  d.addEventListener("mouseenter",function(){inside=true;cancel()});
  d.addEventListener("mouseleave",function(){inside=false;arm()});
  /* keep it open while the inner scrollbar is engaged */
  d.addEventListener("scroll",function(){
    scrollLock=true;cancel();
    clearTimeout(d._sl);d._sl=setTimeout(function(){scrollLock=false;if(!inside)arm()},400);
  },{passive:true});
  /* hide on page scroll, but never when the scroll originates inside the tooltip */
  document.addEventListener("scroll",function(e){
    if(d.contains(e.target))return;
    if(inside||scrollLock)return;
    hide();
  },true);
  return{
    show:function(target,html){
      cancel();cur=target;d.innerHTML=html;d.style.display="block";
      var r=target.getBoundingClientRect(),w=d.offsetWidth,h=d.offsetHeight;
      var x=r.left,y=r.bottom+6;
      if(x+w>innerWidth-8)x=innerWidth-w-8;
      if(x<8)x=8;
      if(y+h>innerHeight-8){y=r.top-h-6;if(y<8)y=8}
      d.style.left=x+"px";d.style.top=y+"px";
    },
    arm:arm,
    hide:function(){inside=false;scrollLock=false;cancel();cur=null;d.style.display="none"}
  };
})();
function bmTipHide(){bmTip.hide()}
function bmTipHTML(it,k,kind){
  var list=[];
  txs.forEach(function(x){
    if(kind==="r"&&x.type!=="aug"&&x.from===it.id&&x.fq===k)list.push({x:x,dir:"out"});
    else if(kind==="t"&&x.type==="aug"&&x.from===it.id&&x.fq===k)list.push({x:x,dir:"out"});
    else if(kind==="f"&&x.type==="aug"&&x.to===it.id&&x.tq===k)list.push({x:x,dir:"in"});
  });
  var title={r:"Release — "+Q[k]+" Quarter",t:"Augmented From (−) — "+Q[k]+" Quarter",f:"Augmented To (+) — "+Q[k]+" Quarter"}[kind];
  var h="<h5>"+esc(title)+"</h5>";
  if(!list.length)return h+'<div class="empty">No transactions.</div>';
  list.sort(function(a,b){return(a.x.date||"").localeCompare(b.x.date||"")});
  list.forEach(function(o){
    var x=o.x,can=isCan(x),other=byId(o.dir==="out"?x.to:x.from);
    var t=can?"<span class='can'>Cancelled</span>":(x.type==="rel"?"Release":"Augmentation");
    var line=esc(it.act)+" – "+esc(it.obj),otherTxt="";
    if(x.type==="aug"){
      var ot=other?esc(other.act)+" – "+esc(other.obj)+" ("+Q[o.dir==="out"?x.tq:x.fq]+" Qtr)":"(deleted item)";
      otherTxt="<div class='to'>→ "+ot+"</div>";
    }
    h+="<div class='tx'><div><b>"+t+"</b> <span class='d'>"+(esc(x.date||"")||"—")+"</span></div>"+
       "<div>"+line+" · <span class='a'>₱ "+money(x.amt)+"</span>"+(x.qty?" · "+qty(x.qty)+" "+(it.unit||""):"")+"</div>"+
       otherTxt+(x.note?"<div class='r'>"+esc(x.note)+"</div>":"")+"</div>";
  });
  return h;
}
var items=load(KEY,[]),txs=load(TXK,[]),meta=load(META,{}),years=load(YK,[]),custom=load(OBJKEY,[]),alloc=load(ALK,[]),catalog=load(CATK,[]);
var thisYear=new Date().getFullYear(),year=+load(CY,0)||+meta.year||thisYear,editing=null,prevObj="";
items.forEach(function(it){if(!it.id)it.id=uid();if(!it.year)it.year=+meta.year||thisYear;if(years.indexOf(+it.year)<0)years.push(+it.year)});
if(years.indexOf(year)<0)years.push(year);
save(KEY,items);save(YK,years);
var yi=function(){return items.filter(function(i){return +i.year===year}).sort(function(a,b){return(a.acct||"~").localeCompare(b.acct||"~",undefined,{numeric:true})})};
var byId=function(id){for(var i=0;i<items.length;i++)if(items[i].id===id)return items[i]};
var tot=function(it){return it.q.reduce(function(a,b){return a+b},0)};

/* ---------- Items (Description): one list per year; Office Budget reads Unit, Stock No. and Unit Price from it ---------- */
var itEdit=null,itQ="";
var ci=function(){return catalog.filter(function(c){return+c.year===year}).sort(function(a,b){return String(a.desc).localeCompare(String(b.desc),undefined,{numeric:true,sensitivity:"base"})})};
function catByDesc(d,yr){d=String(d||"").trim().toLowerCase();if(!d)return null;yr=yr||year;for(var i=0;i<catalog.length;i++){var c=catalog[i];if(+c.year===+yr&&String(c.desc).trim().toLowerCase()===d)return c}return null}
function catById(id){for(var i=0;i<catalog.length;i++)if(catalog[i].id===id)return catalog[i];return null}
function catUse(c){return items.filter(function(it){return it.cid===c.id}).length}
function catSync(c){var n=0;items.forEach(function(it){if(it.cid===c.id){it.desc=c.desc;it.stock=c.stock||"";it.unit=c.unit||"";it.price=c.price;n++}});if(n)save(KEY,items);return n}
function catMigrate(){
 if(catalog.length||!items.length)return;
 var map={};
 items.forEach(function(it){if(!it.desc||!String(it.desc).trim())return;var k=it.year+"\u0001"+String(it.desc).trim().toLowerCase(),c=map[k];
  if(!c){c=map[k]={id:uid(),year:+it.year,desc:String(it.desc).trim(),stock:"",unit:"",price:0};catalog.push(c)}
  c.stock=it.stock||"";c.unit=it.unit||"";c.price=it.price||0});
 items.forEach(function(it){if(!it.desc||it.cid)return;var c=map[it.year+"\u0001"+String(it.desc).trim().toLowerCase()];if(c&&it.price===c.price)it.cid=c.id});
 save(CATK,catalog);save(KEY,items);
}
catMigrate();
/* ---------- searchable Description picker (type any part of the name, unit or stock no., in any order) ---------- */
(function(){
 var dd=document.createElement("div");dd.id="csDrop";document.body.appendChild(dd);
 var cur=null,list=[],act=-1;
 var isDesc=function(t){return t&&t.tagName==="INPUT"&&(t.id==="desc"||(t.dataset&&t.dataset.f==="desc"&&t.closest("#objBlocks")))};
 function hide(){dd.style.display="none";cur=null;act=-1}
 function paint(){
  var toks=cur.value.toLowerCase().split(/\s+/).filter(Boolean);
  list=ci().filter(function(c){var t=(c.desc+" "+(c.stock||"")+" "+(c.unit||"")).toLowerCase();return toks.every(function(w){return t.indexOf(w)>=0})}).slice(0,60);
  act=list.length&&toks.length?0:-1;
  dd.innerHTML=list.length?list.map(function(c,i){return'<div class="cso'+(i===act?" on":"")+'" data-i="'+i+'"><span>'+esc(c.desc)+'</span><small>'+esc((c.unit||"")+" \u00b7 \u20b1"+money(c.price))+'</small></div>'}).join(""):'<div class="csn">'+(ci().length?"No match in the "+year+" Items list. Add it in Items (Description).":"The "+year+" Items list is empty. Add items in Items (Description) first.")+'</div>';
  var r=cur.getBoundingClientRect();dd.style.minWidth=Math.max(r.width,320)+"px";dd.style.display="block";
  var h=dd.offsetHeight,y=r.bottom+2;if(y+h>innerHeight-8&&r.top-h-2>8)y=r.top-h-2;
  dd.style.left=Math.min(r.left,Math.max(8,innerWidth-dd.offsetWidth-8))+"px";dd.style.top=y+"px";
 }
 function pick(i){var c=list[i];if(!c||!cur)return;var t=cur;t.value=c.desc;hide();t.dispatchEvent(new Event("input",{bubbles:true}));t.dispatchEvent(new Event("change",{bubbles:true}));
  var row=t.closest(".xrow"),q=row?row.querySelector('[data-f="q0"]'):$("q1");if(q)q.focus()}
 function mark(){[].forEach.call(dd.querySelectorAll(".cso"),function(e,i){e.classList.toggle("on",i===act);if(i===act)e.scrollIntoView({block:"nearest"})})}
 document.addEventListener("focusin",function(e){if(isDesc(e.target)){cur=e.target;paint()}});
 document.addEventListener("input",function(e){if(isDesc(e.target)){cur=e.target;paint()}});
 document.addEventListener("focusout",function(e){if(e.target===cur)setTimeout(function(){if(document.activeElement!==cur)hide()},120)});
 document.addEventListener("keydown",function(e){
  if(!cur||dd.style.display==="none"||e.target!==cur)return;
  if(e.key==="ArrowDown"){e.preventDefault();if(list.length){act=(act+1)%list.length;mark()}}
  else if(e.key==="ArrowUp"){e.preventDefault();if(list.length){act=(act<=0?list.length:act)-1;mark()}}
  else if(e.key==="Enter"){if(act>=0){e.preventDefault();pick(act)}}
  else if(e.key==="Escape"||e.key==="Tab")hide();
 });
 dd.addEventListener("mousedown",function(e){e.preventDefault();var o=e.target.closest(".cso");if(o)pick(+o.dataset.i)});
 window.addEventListener("resize",hide);
 document.addEventListener("scroll",function(e){if(!dd.contains(e.target))hide()},true);
})();
function fillDescList(){var h="";ci().forEach(function(c){h+='<option value="'+esc(c.desc)+'" label="'+esc((c.unit?c.unit+" \u00b7 ":"")+"\u20b1"+money(c.price))+'"></option>'});$("descList").innerHTML=h}
function renderIT(){
 fillDescList();
 var all=ci(),q=itQ.trim().toLowerCase(),rows=q?all.filter(function(c){return(c.desc+" "+(c.stock||"")+" "+(c.unit||"")).toLowerCase().indexOf(q)>=0}):all;
 $("itSum").textContent="Year "+year+" \u2014 showing "+rows.length+" of "+all.length+" description"+(all.length===1?"":"s")+". Each year has its own list.";
 $("itBody").innerHTML=rows.length?rows.map(function(c){return"<tr><td>"+esc(c.desc)+"</td><td>"+esc(c.stock||"")+"</td><td>"+esc(c.unit||"")+"</td><td class='n'>"+money(c.price)+"</td><td class='n'>"+catUse(c)+"</td><td class='act'><button data-k='e' data-id='"+c.id+"'>Edit</button><button class='d' data-k='d' data-id='"+c.id+"'>Delete</button></td></tr>"}).join(""):"<tr><td colspan='6' class='empty'>"+(all.length?"No descriptions match your search.":"No items for "+year+" yet. Add them above, paste them from Excel, or copy them from another year.")+"</td></tr>";
}
function itClear(){itEdit=null;["itDesc","itStock","itUnit","itPrice"].forEach(function(i){$(i).value=""});$("itTitle").textContent="Add item description";$("itSave").textContent="Add item";$("itCancel").classList.add("hidden");$("itErr").textContent=""}
$("itCancel").onclick=function(){$("itInfo").textContent="";itClear()};
$("itSave").onclick=function(){
 var d=$("itDesc").value.trim(),st=$("itStock").value.trim(),u=$("itUnit").value.trim(),p=parseFloat($("itPrice").value),e=$("itErr"),inf=$("itInfo");inf.textContent="";
 if(!d){e.textContent="Enter the Description.";return}
 if(!u){e.textContent="Enter the Unit (pc, box, ream\u2026).";return}
 if(!(p>0)){e.textContent="Enter a Unit Price greater than zero.";return}
 var dup=catByDesc(d);if(dup&&dup.id!==itEdit){e.textContent="\""+dup.desc+"\" is already in the Items list for "+year+". Edit that one instead.";return}
 var msg="";
 if(itEdit){var c=catById(itEdit);if(!c){itClear();return}c.desc=d;c.stock=st||"N/A";c.unit=u;c.price=p;var n=catSync(c);if(n)msg=n+" budget line"+(n>1?"s":"")+" in Office Budget recomputed with the new details."}
 else catalog.push({id:uid(),year:year,desc:d,stock:st||"N/A",unit:u,price:p});
 save(CATK,catalog);itClear();renderAll();inf.textContent=msg;$("itDesc").focus();
};
$("itBody").addEventListener("click",function(e){
 var b=e.target.closest("button");if(!b||!b.dataset.k)return;var c=catById(b.dataset.id);if(!c)return;$("itInfo").textContent="";
 if(b.dataset.k==="e"){itEdit=c.id;$("itDesc").value=c.desc;$("itStock").value=c.stock||"";$("itUnit").value=c.unit||"";$("itPrice").value=c.price;$("itTitle").textContent="Edit item description";$("itSave").textContent="Update item";$("itCancel").classList.remove("hidden");$("itErr").textContent="";window.scrollTo({top:0,behavior:"smooth"});$("itDesc").focus();return}
 var n=catUse(c);
 if(n){alert("\""+c.desc+"\" is used by "+n+" budget line"+(n>1?"s":"")+" in Office Budget, so it can't be deleted. Delete those lines first, or edit this item instead.");return}
 if(confirm("Delete \""+c.desc+"\" from the Items list?")){catalog=catalog.filter(function(x){return x!==c});save(CATK,catalog);if(itEdit===c.id)itClear();renderAll()}
});
$("itSearch").addEventListener("input",function(){itQ=this.value;renderIT()});
$("itCopy").onclick=function(){
 var ys=years.map(Number).filter(function(y){return y!==year&&catalog.some(function(c){return+c.year===y})}).sort(function(a,b){return b-a});
 if(!ys.length){alert("No other year has an Items list to copy from.");return}
 var s=parseInt(prompt("Copy the Items list from which year?\nAvailable: "+ys.join(", ")),10);if(ys.indexOf(s)<0)return;
 var add=catalog.filter(function(c){return+c.year===s&&!catByDesc(c.desc)});
 if(!add.length){alert("Everything from "+s+" is already in the "+year+" list.");return}
 if(!confirm("Copy "+add.length+" description(s) from "+s+" to "+year+"?\nThey become separate entries: changing a price in "+year+" will not change "+s+"."))return;
 add.forEach(function(c){catalog.push({id:uid(),year:year,desc:c.desc,stock:c.stock||"",unit:c.unit||"",price:c.price})});
 save(CATK,catalog);renderAll();
};
$("itBulk").onclick=function(){
 var d=$("itBulkDlg");
 d.innerHTML='<h3 style="margin-top:0">Paste many descriptions ('+year+')</h3><p class="fsum" style="margin-top:0">In Excel, select 4 columns in this order: <b>Description, Stock No., Unit, Unit Price</b>. Copy them and paste below, one item per row. Descriptions already in the '+year+' list get the new Stock No., Unit and Unit Price (and their budget lines are recomputed).</p><textarea id="itBulkTx" rows="10"></textarea><div class="err" id="itBulkErr"></div><div class="btns" style="justify-content:flex-end"><button type="button" id="itBulkX">Cancel</button><button type="button" class="p" id="itBulkGo">Add / update</button></div>';
 d.showModal();
 $("itBulkX").onclick=function(){d.close()};
 $("itBulkGo").onclick=function(){
  var lines=$("itBulkTx").value.split(/\r?\n/),add=0,upd=0,bad=[],touched=0;
  lines.forEach(function(ln,i){
   if(!ln.trim())return;var p=ln.split("\t"),de=(p[0]||"").trim(),pr=nm(p[3]===undefined?"":p[3]);
   if(i===0&&de.toLowerCase()==="description"&&isNaN(pr))return;
   if(!de||!(p[2]||"").trim()||!(pr>0)){bad.push("Row "+(i+1)+": needs Description, Unit and a Unit Price above 0 (tab-separated)");return}
   var c=catByDesc(de),stk=(p[1]||"").trim()||"N/A";
   if(c){c.stock=stk;c.unit=p[2].trim();c.price=pr;touched+=catSync(c);upd++}
   else{catalog.push({id:uid(),year:year,desc:de,stock:stk,unit:p[2].trim(),price:pr});add++}
  });
  if(!add&&!upd){$("itBulkErr").textContent=bad.length?bad.slice(0,5).join("\n"):"Nothing to add. Paste the rows first.";return}
  save(CATK,catalog);d.close();renderAll();
  $("itInfo").textContent="Added "+add+", updated "+upd+(touched?" ("+touched+" budget line"+(touched>1?"s":"")+" recomputed)":"")+(bad.length?". Skipped "+bad.length+" row(s) with problems: "+bad.slice(0,3).join("; "):"")+".";
 };
};


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
 year=+v;save(CY,year);fillYear();clearForm();if(typeof alClear==="function")alClear();itClear();renderAll();
};

/* ---------- tabs ---------- */
function tab(w){
 $("tabAN").classList.toggle("hidden",w!=="AN");$("tabBtnAN").setAttribute("aria-selected",w==="AN");
 $("tabWF").classList.toggle("hidden",w!=="WF");$("tabBtnWF").setAttribute("aria-selected",w==="WF");
 $("tabOB").classList.toggle("hidden",w!=="OB");$("tabBM").classList.toggle("hidden",w!=="BM");
 $("tabAL").classList.toggle("hidden",w!=="AL");$("tabBtnAL").setAttribute("aria-selected",w==="AL");
 $("tabIT").classList.toggle("hidden",w!=="IT");$("tabBtnIT").setAttribute("aria-selected",w==="IT");
 $("tabBtnOB").setAttribute("aria-selected",w==="OB");$("tabBtnBM").setAttribute("aria-selected",w==="BM");
}
$("tabBtnWF").onclick=function(){tab("WF")};
$("tabBtnOB").onclick=function(){tab("OB")};
$("tabBtnBM").onclick=function(){tab("BM")};
$("tabBtnAL").onclick=function(){tab("AL")};
$("tabBtnAN").onclick=function(){tab("AN")};
$("tabBtnIT").onclick=function(){tab("IT")};
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
function objTotTxt(act,obj,pre){
 if(!obj)return"";var all=0,n=0,inA=0,nA=0;
 yi().forEach(function(it){if(it.obj===obj){var v=tot(it)*it.price;all+=v;n++;if(act&&it.act===act){inA+=v;nA++}}});
 return pre+obj+" ("+year+"): \u20b1 "+money(all)+" in "+n+" item"+(n===1?"":"s")+(act?" \u00b7 in this activity: \u20b1 "+money(inA)+" ("+nA+" item"+(nA===1?"":"s")+")":"");
}
function objTotOB(){var on=$("obj").value.trim().toLowerCase(),h=allObj().filter(function(o){return o[1].toLowerCase()===on})[0];$("objTot").textContent=h?objTotTxt($("act").value.trim(),h[1],"Total estimated budget \u2013 "):""}
function wfpForm(){objTotOB();
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
 fillWfpSel();
 var sd={},d="",U=["pc","box","ream","set","pack","bottle","roll","unit","lot"],su={};
 items.forEach(function(it){if(it.desc&&!sd[it.desc.toLowerCase()]){sd[it.desc.toLowerCase()]=1;d+='<option value="'+esc(it.desc)+'"></option>'}if(it.unit&&U.indexOf(it.unit)<0)U.push(it.unit)});
 fillDescList();$("units").innerHTML=U.map(function(u){return'<option value="'+esc(u)+'"></option>'}).join("");
 fillPrices();
}
function fillPrices(){
 var v=$("desc").value.trim().toLowerCase(),seen={},h="",mine=items.filter(function(i){return i.desc&&i.desc.toLowerCase()===v&&i.price});
 (mine.length?mine:items).slice().reverse().forEach(function(i){if(i.price&&!seen[i.price]){seen[i.price]=1;h+='<option value="'+i.price+'"></option>'}});
 $("priceList").innerHTML=h;
}
function pickDesc(){
 var c=catByDesc($("desc").value),o=editing!==null?byId(editing):null,free=!!(o&&!o.cid&&!c);
 if(c){$("desc").value=c.desc;$("stock").value=c.stock||"";$("unit").value=c.unit||"";$("price").value=c.price}
 else if(!free){$("stock").value="";$("unit").value="";$("price").value=""}
 ["stock","unit","price"].forEach(function(id){$(id).readOnly=!free});
 var h=$("descHint");if(h){var v=$("desc").value.trim();h.textContent=(v&&!c&&!free)?"Not in the Items list for "+year+" \u2013 add it first in Items (Description).":""}
 calcForm();
}
$("desc").addEventListener("input",pickDesc);$("desc").addEventListener("change",pickDesc);
/* ---------- AIP Code + Activity come from the Work Financial Plan ---------- */
function wfpPairs(incItems){
 var seen={},o=[],add=function(a,c){a=a||"";c=c||"";if(!a&&!c)return;var k=a+"\u0001"+c;if(seen[k])return;seen[k]=1;o.push({aip:a,act:c})};
 alloc.forEach(function(r){if(+r.year===year)add(r.aip,r.act)});
 if(incItems)yi().forEach(function(i){add(i.aip,i.act)});
 return o;
}
function wsel(vals,sel,ph,legacy){
 var h='<option value="">'+esc(ph)+'</option>';
 vals.forEach(function(v){h+='<option value="'+esc(v)+'"'+(v===sel?" selected":"")+'>'+esc(v)+(legacy&&legacy.indexOf(v)>=0?"  (not in WFP)":"")+'</option>'});
 return h;
}
function fillWfpSel(sa,sc){
 var A=$("aip"),C=$("act");if(!A||!C)return;
 var aip=sa!==undefined?sa:A.value,act=sc!==undefined?sc:C.value,P=wfpPairs(false),lg=[],ed=editing!==null;
 var aips=uniq(P.map(function(x){return x.aip}));
 if(aip&&aips.indexOf(aip)<0){if(ed){aips.push(aip);lg.push(aip)}else aip=""}
 var acts=uniq(P.filter(function(x){return!aip||x.aip===aip}).map(function(x){return x.act}));
 if(act&&acts.indexOf(act)<0){if(ed){acts.push(act);lg.push(act)}else act=""}
 if(!aip&&act){var m=uniq(P.filter(function(x){return x.act===act}).map(function(x){return x.aip}));if(m.length===1){aip=m[0];acts=uniq(P.filter(function(x){return x.aip===aip}).map(function(x){return x.act}))}}
 if(aip&&!act&&acts.length===1)act=acts[0];
 var none="No WFP for "+year+" \u2013 add it in Work Financial Plan first";
 A.innerHTML=wsel(aips,aip,P.length?"Select AIP Code\u2026":none,lg);
 C.innerHTML=wsel(acts,act,P.length?"Select activity\u2026":none,lg);
}
$("aip").addEventListener("change",function(){$("act").value="";fillWfpSel();wfpForm()});
$("act").addEventListener("change",function(){fillWfpSel();wfpForm()});
function clearForm(){
 ["aip","act","desc","stock","unit","price","mode","remarks","q1","q2","q3","q4"].forEach(function(id){$(id).value=""});
 $("obj").value="";$("acct").value="";prevObj="";editing=null;fillWfpSel("","");
 $("formTitle").textContent="Add item";$("btnSave").textContent="Add item";$("btnCancel").classList.add("hidden");$("err").textContent="";calcForm();
 bxRows={};bxKey="";if(bxReady)bxRender();pickDesc();
}
$("btnSave").onclick=function(){
 if(bxActive()){bxSave();return}
 var it={aip:$("aip").value.trim(),act:$("act").value.trim(),desc:$("desc").value.trim(),obj:$("obj").value,acct:$("acct").value,stock:$("stock").value.trim(),
  unit:$("unit").value.trim(),price:parseFloat($("price").value)||0,mode:$("mode").value.trim(),remarks:$("remarks").value.trim(),
  q:[1,2,3,4].map(function(i){return parseFloat($("q"+i).value)||0})},e=$("err");
 if(!it.aip||!it.act||!it.desc){e.textContent="Select the AIP Code and Activities (from the Work Financial Plan) and enter a Description.";return}
 var cc=catByDesc(it.desc),old0=editing!==null?byId(editing):null;
 if(cc){it.cid=cc.id;it.desc=cc.desc;it.stock=cc.stock||"";it.unit=cc.unit||"";it.price=cc.price}
 else if(!(old0&&!old0.cid)){e.textContent="Select a Description from the Items list for "+year+". If it is not there yet, add it first in Items (Description).";return}
 if(!it.obj||it.obj==="__add__"){e.textContent="Select an Object of Expenditure.";return}
 if(!(it.price>0)){e.textContent="Enter a Unit Price greater than zero.";return}
 if(tot(it)<=0){e.textContent="Enter a quantity for at least one quarter.";return}
 if(editing===null){it.id=uid();it.year=year;items.push(it)}
 else{var o=byId(editing);it.id=o.id;it.year=o.year;items[items.indexOf(o)]=it}
 save(KEY,items);clearForm();renderAll();refreshLists();$("aip").focus();
};
$("btnCancel").onclick=clearForm;$("btnClear").onclick=clearForm;

/* ---------- Add items by Object of Expenditure (objects come from the WFP of the chosen Activity) ---------- */
var bxSingle=false,bxRows={},bxKey="",bxObjs=[],bxReady=false;
function bxEmpty(){return{desc:"",stock:"",unit:"",price:"",mode:"",remarks:"",q:["","","",""]}}
function bxActive(){return editing===null&&!bxSingle}
function bxList(){var act=$("act").value.trim();if(!act)return[];var s={};alloc.forEach(function(r){if(+r.year===year&&r.act===act&&r.obj)s[r.obj]=1});return Object.keys(s).sort(byObj)}
function bxGet(oi){var k=year+"|"+$("act").value.trim()+"|"+bxObjs[oi];return bxRows[k]||(bxRows[k]=[bxEmpty()])}
function bxUsed(r){return!!(r.desc.trim()||r.price!==""||r.q.some(function(v){return v!==""}))}
function bxRowHtml(oi,ri,r,many){
 var f=function(n,l,cl,ex){return'<div class="'+cl+'"><label>'+l+'</label><input data-f="'+n+'" '+ex+' value="'+esc(r[n])+'"></div>'};
 var h='<div class="xrow" data-oi="'+oi+'" data-ri="'+ri+'"><div class="xh">Description '+(ri+1)+'</div>'
  +'<div class="x4"><label>Description</label><input data-f="desc" autocomplete="off" placeholder="Type to search the Items list…" value="'+esc(r.desc)+'"><small class="xa xdh"></small></div>'
  +f("stock","Stock No.","x2",'readonly tabindex="-1" placeholder="auto"')
  +f("unit","Unit","x2",'readonly tabindex="-1" placeholder="auto"')
  +f("price","Unit Price","x2",'type="number" readonly tabindex="-1" placeholder="auto"')
  +f("mode","Mode of Procurement","x2",'list="modeList" autocomplete="off"');
 for(var k=0;k<4;k++)h+='<div class="x2"><label>'+Q[k]+' Quarter qty</label><input data-f="q'+k+'" type="number" min="0" step="any" value="'+esc(r.q[k])+'"><small class="xa"></small></div>';
 h+='<div class="x2"><label>Total quantity</label><input class="xtq" readonly></div><div class="x2"><label>Estimated budget</label><input class="xeb" readonly></div>'
  +f("remarks","Remarks (optional)","x10",'autocomplete="off"')
  +'<div class="x2 xdel">'+(many?'<button type="button" class="d" data-xdel="1">Remove</button>':'')+'</div></div>';
 return h;
}
function bxBlockHtml(oi){
 var o=bxObjs[oi],rows=bxGet(oi);
 return'<fieldset class="xblk" data-oi="'+oi+'"><legend>'+esc(o)+' <span style="font-weight:400">\u00b7 '+esc(codeOf(o))+'</span></legend><div class="xst"></div>'
  +rows.map(function(r,ri){return bxRowHtml(oi,ri,r,rows.length>1)}).join("")
  +'<button type="button" data-xadd="1">+ Add description</button></fieldset>';
}
function bxStatus(){
 var box=$("objBlocks"),act=$("act").value.trim(),T=itemTotals(null),nItems=0,grand=0;
 [].forEach.call(box.querySelectorAll(".xblk"),function(bl){
  var oi=+bl.dataset.oi,o=bxObjs[oi],rows=bxGet(oi),st="";
  [].forEach.call(bl.querySelectorAll(".xrow"),function(re){
   var r=rows[+re.dataset.ri],p=parseFloat(r.price)||0,tq=0;
   for(var k=0;k<4;k++){var q=parseFloat(r.q[k])||0;tq+=q;re.querySelectorAll(".xa")[k].textContent=q&&p?"= "+money(q*p):""}
   re.querySelector(".xtq").value=tq?qty(tq):"";re.querySelector(".xeb").value=tq&&p?money(tq*p):"";
   var hh=re.querySelector(".xdh");if(hh){var dd=r.desc.trim();hh.textContent=dd&&!catByDesc(dd)?"Not in the Items list for "+year+" \u2013 add it in Items (Description).":""}
  });
  for(var k=0;k<4;k++){
   var w=wfpOf(act,o,k),ex=T[act+"|"+o+"|"+k]||0,th=0;
   rows.forEach(function(r){th+=(parseFloat(r.q[k])||0)*(parseFloat(r.price)||0)});
   if(!w&&!ex&&!th)continue;
   var bal=w-ex-th,over=bal<-0.005;
   st+="<div style='color:"+(over?"#b3261e":"inherit")+"'>"+Q[k]+" Quarter \u2014 WFP: "+money(w)+" \u00b7 already itemized: "+money(ex)+" \u00b7 this entry: "+money(th)+" \u00b7 "+(over?"OVER the WFP by "+money(-bal):"balance: "+money(bal))+"</div>";
  }
  bl.querySelector(".xst").innerHTML=st;
  rows.forEach(function(r){if(!bxUsed(r))return;nItems++;grand+=r.q.reduce(function(s,v){return s+(parseFloat(v)||0)},0)*(parseFloat(r.price)||0)});
 });
 var s=$("bxSum");if(s)s.textContent=nItems?"Ready to add: "+nItems+" item"+(nItems>1?"s":"")+" \u00b7 total estimated budget "+money(grand):"";
}
function bxRender(){
 var box=$("objBlocks"),one=$("oneItem"),sw=$("bxSw"),act=$("act").value.trim();
 $("bxSwWrap").classList.toggle("hidden",editing!==null);
 if(!bxActive()){box.classList.add("hidden");one.classList.remove("hidden");sw.textContent="\u2190 Enter by Object of Expenditure from the WFP";return}
 sw.textContent="Enter a single item instead (any Object of Expenditure)";
 $("formTitle").textContent="Add item";$("btnSave").textContent="Add items";
 one.classList.add("hidden");box.classList.remove("hidden");
 var objs=bxList(),key=year+"|"+act+"|"+objs.join("\u0001");
 if(!act){box.innerHTML='<div class="fsum" style="margin:0">Select the AIP Code and Activities above. Every Object of Expenditure of that activity in the Work Financial Plan will appear here, ready for your descriptions and quarterly quantities.</div>';bxKey="";bxObjs=[];return}
 if(!objs.length){box.innerHTML='<div class="fsum" style="margin:0">No Work Financial Plan entries for this activity in '+year+' yet. Add them in the WFP tab, or enter a single item instead.</div>';bxKey="";bxObjs=[];return}
 if(key===bxKey&&box.querySelector(".xblk")){bxStatus();return}
 bxKey=key;bxObjs=objs;
 box.innerHTML=objs.map(function(o,oi){return bxBlockHtml(oi)}).join("")+'<div class="info" id="bxSum"></div>';
 bxStatus();
}
function bxRowOf(t){var re=t.closest(".xrow");if(!re)return null;var oi=+re.dataset.oi,ri=+re.dataset.ri;return{re:re,oi:oi,ri:ri,r:bxGet(oi)[ri]}}
$("objBlocks").addEventListener("input",function(e){
 var f=e.target.dataset.f,x=bxRowOf(e.target);if(!f||!x)return;
 if(f.length===2&&f.charAt(0)==="q")x.r.q[+f.charAt(1)]=e.target.value;else x.r[f]=e.target.value;
 if(f==="desc"){var c=catByDesc(e.target.value),set=function(n,v){x.r[n]=(v===undefined||v===null)?"":String(v);var el=x.re.querySelector('[data-f="'+n+'"]');if(el)el.value=x.r[n]};
  if(c){set("unit",c.unit);set("stock",c.stock);set("price",c.price)}else{set("unit","");set("stock","");set("price","")}}
 bxStatus();
});
$("objBlocks").addEventListener("change",function(e){
 var f=e.target.dataset.f,x=bxRowOf(e.target);if(!f||!x)return;
 if(f==="mode"){var v=e.target.value.trim().toLowerCase();if(v){var ok=MODES.filter(function(m){return m.toLowerCase()===v})[0];if(ok){e.target.value=ok;x.r.mode=ok}else{alert("Mode of Procurement must be Procurement or Non-Procurement.");e.target.value="";x.r.mode=""}}}
 if(f==="desc"){var c=catByDesc(x.r.desc);if(c){x.r.desc=c.desc;e.target.value=c.desc}bxStatus()}
});
$("objBlocks").addEventListener("click",function(e){
 var b=e.target.closest("button");if(!b)return;
 var bl=b.closest(".xblk");if(!bl)return;var oi=+bl.dataset.oi,rows=bxGet(oi);
 if(b.dataset.xadd){rows.push(bxEmpty());bxKey="";bxRender();var rs=$("objBlocks").querySelectorAll('.xblk[data-oi="'+oi+'"] .xrow');var l=rs[rs.length-1];if(l)l.querySelector('[data-f="desc"]').focus()}
 else if(b.dataset.xdel){var x=bxRowOf(b);if(x){rows.splice(x.ri,1);if(!rows.length)rows.push(bxEmpty());bxKey="";bxRender()}}
});
$("bxSw").addEventListener("click",function(e){e.preventDefault();if(editing!==null)return;bxSingle=!bxSingle;$("err").textContent="";if(!bxSingle)bxKey="";bxRender();if(bxSingle){$("btnSave").textContent="Add item"}});
$("aip").addEventListener("change",function(){bxRender()});
$("act").addEventListener("change",function(){bxRender()});
function bxSave(){
 var e=$("err"),aip=$("aip").value.trim(),act=$("act").value.trim(),out=[],bad="";
 if(!aip||!act){e.textContent="Select the AIP Code and Activities (from the Work Financial Plan).";return}
 bxObjs.forEach(function(o,oi){bxGet(oi).forEach(function(r,ri){
  if(bad||!bxUsed(r))return;
  var p=parseFloat(r.price)||0,q=r.q.map(function(v){return parseFloat(v)||0}),lb=o+" \u2013 description "+(ri+1)+": ",m=r.mode.trim();
  if(!r.desc.trim()){bad=lb+"enter a Description.";return}
  var cc=catByDesc(r.desc);if(!cc){bad=lb+"the Description is not in the Items list for "+year+". Add it first in Items (Description).";return}
  p=cc.price;
  if(!(p>0)){bad=lb+"enter a Unit Price greater than zero.";return}
  if(q.reduce(function(s,v){return s+v},0)<=0){bad=lb+"enter a quantity for at least one quarter.";return}
  if(m){var ok=MODES.filter(function(x){return x.toLowerCase()===m.toLowerCase()})[0];if(!ok){bad=lb+"Mode of Procurement must be Procurement or Non-Procurement.";return}m=ok}
  out.push({aip:aip,act:act,cid:cc.id,desc:cc.desc,obj:o,acct:codeOf(o),stock:cc.stock||"",unit:cc.unit||"",price:p,mode:m,remarks:r.remarks.trim(),q:q,id:uid(),year:year});
 })});
 if(bad){e.textContent=bad;return}
 if(!out.length){e.textContent="Enter at least one description with a unit price and a quantity.";return}
 out.forEach(function(it){items.push(it)});save(KEY,items);
 clearForm();renderAll();refreshLists();$("aip").focus();
}
bxReady=true;bxRender();
function edit(id){
 var it=byId(id);if(!it)return;editing=id;
 fillWfpSel(it.aip,it.act||"");$("desc").value=it.desc;$("stock").value=it.stock;$("unit").value=it.unit;
 $("price").value=it.price;modeSet(it.mode);$("remarks").value=it.remarks||"";$("obj").value=it.obj||"";$("acct").value=it.acct||"";prevObj=$("obj").value;
 for(var k=0;k<4;k++)$("q"+(k+1)).value=it.q[k]||"";
 pickDesc();calcForm();entryShow(true,1);$("formTitle").textContent="Edit item";$("btnSave").textContent="Update item";$("btnCancel").classList.remove("hidden");
 if(bxReady)bxRender();window.scrollTo({top:0,behavior:"smooth"});$("aip").focus();
}

/* ---------- Office Budget report ---------- */
function renderOB(){
 var list=fi("ob"),h="",gq=0,gb=0,gqq=[0,0,0,0],ga=[0,0,0,0];
 if(!list.length){$("obBody").innerHTML='<tr><td class="empty" colspan="21">'+(yi().length?"No items match the selected filters.":"No items for "+year+" yet. Fill in the form above and select Add item.")+'</td></tr>';$("obFoot").innerHTML="";return}
 var OT=itemTotals(null),over={};
 yi().forEach(function(it){var key=it.act+"|"+it.obj;if(key in over)return;var sm=0,w=0;for(var k=0;k<4;k++){sm+=OT[key+"|"+k]||0;w+=wfpOf(it.act,it.obj,k)}over[key]=sm-w>0.005?{s:sm,w:w}:null});
 list.forEach(function(it){
  var t=tot(it),b=t*it.price,ov=over[it.act+"|"+it.obj];gq+=t;gb+=b;
  h+="<tr"+(ov?" class='over' title='Over the WFP: itemized "+money(ov.s)+" vs WFP "+money(ov.w)+" for this object in this activity'":"")+"><td>"+esc(it.aip)+"</td><td>"+esc(it.act)+"</td><td>"+esc(it.desc)+"</td><td>"+esc(it.obj)+"</td><td style='white-space:nowrap'>"+esc(it.acct)+"</td><td>"+esc(it.stock)+"</td><td class='c'>"+esc(it.unit)+"</td><td class='n'>"+money(it.price)+"</td><td class='n'>"+qty(t)+"</td><td class='n'>"+money(b)+"</td><td>"+esc(it.mode)+"</td>";
  for(var k=0;k<4;k++){var a=it.q[k]*it.price;gqq[k]+=it.q[k];ga[k]+=a;h+="<td class='n'>"+(it.q[k]?qty(it.q[k]):"")+"</td><td class='n'>"+(a?money(a):"")+"</td>"}
  h+="<td>"+esc(it.remarks||"")+"</td><td class='act'><button data-e='"+it.id+"'>Edit</button><button class='d' data-d='"+it.id+"'>Delete</button></td></tr>";
 });
 $("obBody").innerHTML=h;
 $("obFoot").innerHTML="<tr><td colspan='8' style='text-align:right'>TOTAL</td><td class='n'>"+qty(gq)+"</td><td class='n'>"+money(gb)+"</td><td></td>"+
  gqq.map(function(v,k){return"<td class='n'>"+qty(v)+"</td><td class='n'>"+money(ga[k])+"</td>"}).join("")+"<td></td><td class='act'></td></tr>";
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
/* ----- Budget Monitoring: show / hide fields ----- */
var BMC={c:[],t:0,s:[]};try{var _bc=JSON.parse(localStorage.getItem("wfp_bm_cols")||"null");if(_bc&&typeof _bc==="object")BMC={c:_bc.c||[],t:_bc.t?1:0,s:_bc.s||[]}}catch(e){}
function bmColSave(){try{localStorage.setItem("wfp_bm_cols",JSON.stringify(BMC))}catch(e){}}
function bmVisSub(){var n=0;SUB.forEach(function(s,j){if(!BMC.s[j])n++});return n}
function bmVisBase(){var n=0;BASE.forEach(function(b,i){if(!BMC.c[i])n++});return n}
function buildBMHead(){
 var h="<tr>",ns=bmVisSub()||1;
 BASE.forEach(function(b,i){h+='<th rowspan="2" class="bc'+i+'">'+b+'</th>'});
 Q.forEach(function(q,i){h+='<th colspan="'+ns+'" class="bq'+i+'">'+q+' Quarter <button type="button" class="qh" data-qh="'+i+'" title="Hide this quarter">Hide</button></th><th rowspan="2" class="bqs bqs'+i+'"><button type="button" class="qh" data-qh="'+i+'" title="Show this quarter again">'+q+' Quarter &#9656;</button></th>'});
 h+='<th rowspan="2" class="bct">Total Balance</th></tr><tr>';
 for(var k=0;k<4;k++)SUB.forEach(function(s,j){h+="<th class='bq"+k+" bs"+j+"'>"+s+"</th>"});
 $("bmHead").innerHTML=h+"</tr>";
}
function bmColApply(){
 var css="",hid=0;
 BASE.forEach(function(b,i){if(BMC.c[i]){css+="table.bm .bc"+i+"{display:none}";hid++}});
 if(BMC.t){css+="table.bm .bct{display:none}";hid++}
 SUB.forEach(function(s,j){if(BMC.s[j]){css+="table.bm .bs"+j+"{display:none}";hid+=4}});
 css+="table.bm{min-width:"+Math.max(900,Math.round(3300*(1-hid/32)))+"px}";
 var st=$("bmColStyle");if(!st){st=document.createElement("style");st.id="bmColStyle";document.head.appendChild(st)}
 st.textContent=css;
}
function bmColSum(){
 var n=0;BASE.forEach(function(b,i){if(BMC.c[i])n++});if(BMC.t)n++;SUB.forEach(function(s,j){if(BMC.s[j])n++});
 var qh=0;for(var k=0;k<4;k++)if(!BMQ[k])qh++;
 var el=$("bmCols"),sm=el&&el.querySelector("summary");if(sm)sm.textContent=(n+qh)?"Fields: "+n+" hidden"+(qh?" \u00b7 "+qh+" quarter"+(qh>1?"s":"")+" hidden":""):"Fields: all shown";
}
function bmColUi(){
 var el=$("bmCols");if(!el)return;
 var d=el.querySelector("details"),op=d&&d.open,b0=el.querySelector(".msb"),sc=b0?b0.scrollTop:0;
 var h='<details'+(op?" open":"")+'><summary></summary><div class="msb"><div class="mh">Columns</div>';
 BASE.forEach(function(b,i){h+='<label><input type="checkbox" data-bc="c'+i+'"'+(BMC.c[i]?"":" checked")+'> '+esc(b)+'</label>'});
 h+='<label><input type="checkbox" data-bc="t"'+(BMC.t?"":" checked")+'> Total Balance</label><div class="mh">Sub-columns (every quarter)</div>';
 SUB.forEach(function(s,j){h+='<label><input type="checkbox" data-bc="s'+j+'"'+(BMC.s[j]?"":" checked")+'> '+esc(s)+'</label>'});
 h+='<div class="mh">Quarters</div>';
 Q.forEach(function(q,k){h+='<label><input type="checkbox" data-bq="'+k+'"'+(BMQ[k]?" checked":"")+'> '+q+' Quarter</label>'});
 el.innerHTML=h+'</div></details>';
 var nb=el.querySelector(".msb");if(nb)nb.scrollTop=sc;
 bmColSum();
}
buildBMHead();
var LCm=null,LCt=null,LCn=-1;
function lineCalc(it){
 if(LCt!==txs||LCn!==txs.length){LCm={};var Z=function(id){return LCm[id]||(LCm[id]={r:[0,0,0,0],t:[0,0,0,0],f:[0,0,0,0],cr:[0,0,0,0],ct:[0,0,0,0],cf:[0,0,0,0]})};txs.forEach(function(x){var c=isCan(x);if(x.type!=="aug"){(c?Z(x.from).cr:Z(x.from).r)[x.fq]+=x.amt}else{(c?Z(x.from).ct:Z(x.from).t)[x.fq]+=x.amt;(c?Z(x.to).cf:Z(x.to).f)[x.tq]+=x.amt}});LCt=txs;LCn=txs.length}
 var a=LCm[it.id]||{r:[0,0,0,0],t:[0,0,0,0],f:[0,0,0,0],cr:[0,0,0,0],ct:[0,0,0,0],cf:[0,0,0,0]},b=[],bal=[],k;
 for(k=0;k<4;k++){b[k]=it.q[k]*it.price;bal[k]=b[k]-a.r[k]-a.t[k]+a.f[k]}
 return{b:b,r:a.r,t:a.t,f:a.f,bal:bal,cr:a.cr,ct:a.ct,cf:a.cf};
}
var lineLabel=function(it){return it?it.act+" – "+it.obj+" ("+it.acct+") – "+it.aip+" – "+it.desc:"(deleted item)"};
var BMQ=[1,1,1,1];try{var _bq=JSON.parse(localStorage.getItem("wfp_bm_q")||"null");if(_bq&&_bq.length===4)BMQ=_bq}catch(e){}
function bmQApply(){var t=document.querySelector("table.bm");for(var k=0;k<4;k++)t.classList.toggle("hq"+k,!BMQ[k])}
$("bmHead").addEventListener("click",function(e){var b=e.target.closest("[data-qh]");if(!b)return;var k=+b.dataset.qh;BMQ[k]=BMQ[k]?0:1;try{localStorage.setItem("wfp_bm_q",JSON.stringify(BMQ))}catch(x){}bmQApply();bmColUi()});
bmQApply();bmColApply();bmColUi();
$("bmCols").addEventListener("change",function(e){
 var i=e.target;
 if(i.dataset.bq!==undefined){var k=+i.dataset.bq;BMQ[k]=i.checked?1:0;try{localStorage.setItem("wfp_bm_q",JSON.stringify(BMQ))}catch(x){}bmQApply();bmColSum();return}
 var key=i.dataset.bc;if(!key)return;var v=i.checked?0:1;
 if(key==="t")BMC.t=v;
 else if(key.charAt(0)==="c")BMC.c[+key.slice(1)]=v;
 else{var j=+key.slice(1);if(v&&bmVisSub()<=1){i.checked=true;alert("Keep at least one of the quarter sub-columns visible.");return}BMC.s[j]=v}
 bmColSave();buildBMHead();bmColApply();renderBM();bmColSum();
});
$("bmColsAll").onclick=function(){BMC={c:[],t:0,s:[]};BMQ=[1,1,1,1];bmColSave();try{localStorage.setItem("wfp_bm_q",JSON.stringify(BMQ))}catch(x){}buildBMHead();bmColApply();bmQApply();renderBM();bmColUi()};
var cellx=function(v,cls,red){return"<td class='n"+(cls?" "+cls:"")+"'"+(red?" style='color:var(--warn);font-weight:700' title='This item has a cancelled transaction in this quarter (not deducted from the balance)'":"")+">"+(v?money(v):"")+"</td>"};
var cell=function(v,cls){return"<td class='n"+(cls?" "+cls:"")+"'>"+(v?money(v):"")+"</td>"};
function renderBM(){
 var list=fi("bm"),h="",T=[],i;var TC=[];for(i=0;i<20;i++){T[i]=0;TC[i]=0}var tb=0;
 if(!list.length){$("bmBody").innerHTML='<tr><td class="empty" colspan="32">'+(yi().length?"No budget lines match the selected filters.":"No budget lines for "+year+". Add items in Office Budget first.")+'</td></tr>';$("bmFoot").innerHTML=""}
 else{
  list.forEach(function(it){
   var c=lineCalc(it),t=tot(it),sum=0;
   h+="<tr><td class='bc0'>"+esc(it.aip)+"</td><td class='bc1'>"+esc(it.act)+"</td><td class='bc2'>"+esc(it.desc)+"</td><td class='bc3'>"+esc(it.obj)+"</td><td class='bc4' style='white-space:nowrap'>"+esc(it.acct)+"</td><td class='bc5'>"+esc(it.stock)+"</td><td class='c bc6'>"+esc(it.unit)+"</td><td class='n bc7'>"+money(it.price)+"</td><td class='n bc8'>"+qty(t)+"</td><td class='n bc9'>"+money(t*it.price)+"</td><td class='bc10'>"+esc(it.mode)+"</td>";
      for(var k=0;k<4;k++){
    var rCell=cellx(c.r[k],"bq"+k+" bs1",c.cr[k]),tCell=cellx(c.t[k],"bq"+k+" bs2",c.ct[k]),fCell=cellx(c.f[k],"bq"+k+" bs3",c.cf[k]);
    if(c.r[k]||c.cr[k])rCell=rCell.replace("<td","<td data-bmtip='r|"+it.id+"|"+k+"'");
    if(c.t[k]||c.ct[k])tCell=tCell.replace("<td","<td data-bmtip='t|"+it.id+"|"+k+"'");
    if(c.f[k]||c.cf[k])fCell=fCell.replace("<td","<td data-bmtip='f|"+it.id+"|"+k+"'");
    h+=cellx(c.b[k],"bq"+k+" bs0",c.cr[k]||c.ct[k]||c.cf[k])+rCell+tCell+fCell+"<td class='n bal bs4 bq"+k+(c.bal[k]<-0.005?" neg":"")+"'>"+((c.b[k]||c.bal[k])?money(c.bal[k]):"")+"</td><td class='bqs bqs"+k+"'></td>";
    T[k*5]+=c.b[k];T[k*5+1]+=c.r[k];T[k*5+2]+=c.t[k];T[k*5+3]+=c.f[k];T[k*5+4]+=c.bal[k];TC[k*5+1]+=c.cr[k];TC[k*5+2]+=c.ct[k];TC[k*5+3]+=c.cf[k];sum+=c.bal[k];
   }
   tb+=sum;h+="<td class='n bal bct"+(sum<-0.005?" neg":"")+"'>"+money(sum)+"</td></tr>";
  });
  $("bmBody").innerHTML=h;
        if(!$("bmBody")._tipBound){
   $("bmBody")._tipBound=1;
   $("bmBody").addEventListener("mouseover",function(e){
    var td=e.target.closest("[data-bmtip]");if(!td)return;
    var p=td.dataset.bmtip.split("|"),it=byId(p[1]),k=+p[2];if(!it)return;
    bmTip.show(td,bmTipHTML(it,k,p[0]));
   });
   $("bmBody").addEventListener("mouseout",function(e){
    var td=e.target.closest("[data-bmtip]");if(!td)return;
    if(e.relatedTarget&&td.contains(e.relatedTarget))return;
    bmTip.arm();
   });
   var _bmWrap=document.querySelector("table.bm");if(_bmWrap&&_bmWrap.closest(".wrap"))_bmWrap.closest(".wrap").addEventListener("scroll",bmTipHide,{passive:true});
  }
  var _nb=bmVisBase();$("bmFoot").innerHTML="<tr>"+(_nb?"<td colspan='"+_nb+"' style='text-align:right'>TOTAL</td>":"")+T.slice(0,20).map(function(v,i){return"<td class='n bq"+Math.floor(i/5)+" bs"+(i%5)+"'>"+money(v)+"</td>"+(i%5===4?"<td class='bqs bqs"+Math.floor(i/5)+"'></td>":"")}).join("")+"<td class='n bct'>"+money(tb)+"</td></tr>";
 }
 // transaction log
 var lg="";
 txs.forEach(function(x){
  var s=byId(x.from);if(!s||+s.year!==year)return;if(list.indexOf(s)<0&&list.indexOf(byId(x.to))<0)return;if(!lgOk(x,s))return;
  lg+="<tr><td>"+esc(x.date||"")+"</td><td>"+(isCan(x)?"<b style='color:var(--warn)'>Cancelled</b>":(x.type==="rel"?"Release":"Augmentation"))+"</td><td>"+esc(lineLabel(s))+" ("+Q[x.fq]+" Quarter)</td><td>"+
   (x.to?esc(lineLabel(byId(x.to)))+" ("+Q[x.tq]+" Quarter)":"")+"</td><td class='n'"+(isCan(x)?" style='color:var(--warn);font-weight:700'":"")+">"+(x.qty?x.qty:"")+"</td><td class='n'"+(isCan(x)?" style='color:var(--warn);font-weight:700'":"")+">"+money(x.amt)+"</td><td>"+esc(x.note||"")+"</td><td class='act'><button data-e='"+x.id+"'>Edit</button> <button class='d' data-t='"+x.id+"'>Delete</button></td></tr>";
 });
 $("lgBody").innerHTML=lg||'<tr><td class="empty" colspan="8">No releases or augmentations recorded for '+year+'.</td></tr>';
}
var TF={aip:[],act:[],type:[],q:[],rem:[],stat:[]},txEdit=null;
function isCan(x){if(x.type==="can")return true;if(x.v===2)return false;return x.status?x.status==="Cancelled":/cancel/i.test(x.note||"")}
function lgOn(){return TF.act.length||TF.type.length||TF.q.length||TF.rem.length||TF.stat.length}
function lgOk(x,s){var d=byId(x.to);
 if(TF.type.length&&TF.type.indexOf(isCan(x)?"can":x.type)<0)return false;

 if(TF.aip.length&&!(TF.aip.indexOf(s.aip)>=0||(d&&TF.aip.indexOf(d.aip)>=0)))return false;
 if(TF.act.length&&!(TF.act.indexOf(s.act)>=0||(x.type==="aug"&&d&&TF.act.indexOf(d.act)>=0)))return false;
 if(TF.rem.length){var n=(x.note||"").trim().toLowerCase();if(!TF.rem.some(function(r){return r==="__none__"?n==="":n===r.toLowerCase()}))return false}
 if(TF.q.length&&!TF.q.some(function(k){k=+k;return x.fq===k||(x.type==="aug"&&x.tq===k)}))return false;
 return true}
function fillLgFilt(){
 var ap=uniq(yi().map(function(i){return i.aip})),a=uniq(yi().map(function(i){return i.act})),f=$("lgFilt"),g=function(k){return f.querySelector('[data-lf="'+k+'"]')};
 TF.act=TF.act.filter(function(v){return a.indexOf(v)>=0});TF.aip=TF.aip.filter(function(v){return ap.indexOf(v)>=0});
 var seen={},rm=[];txs.forEach(function(x){var n=(x.note||"").trim(),k=n.toLowerCase();if(n&&!seen[k]){seen[k]=1;rm.push(n)}});rm.sort(function(x,y){return x.localeCompare(y)});
 TF.rem=TF.rem.filter(function(r){return r==="__none__"||seen[r.toLowerCase()]});
 msFill(g("aip"),L1(ap),TF.aip,"All AIP codes");msFill(g("act"),L1(a),TF.act,"All activities");msFill(g("type"),[{v:"rel",t:"Release"},{v:"aug",t:"Augmentation"},{v:"can",t:"Cancelled"}],TF.type,"All transactions");msFill(g("q"),QO(),TF.q,"All quarters");
 msFill(g("rem"),[{v:"__none__",t:"(No remarks)"}].concat(L1(rm)),TF.rem,"All remarks");
}
$("lgFilt").addEventListener("change",function(e){var b=e.target.closest(".ms");if(!b||!b.dataset.lf)return;TF[b.dataset.lf]=msVal(b);msNow(b);later(function(){fillLgFilt();renderBM()})});
$("lgFilt").addEventListener("click",function(e){var mc=msClear(e);if(mc){TF[mc.dataset.lf]=[];fillLgFilt();renderBM();return}if(e.target.dataset.lclr){TF={aip:[],act:[],type:[],q:[],rem:[],stat:[]};fillLgFilt();renderBM()}});
function txShow(on,np){$("txBody").classList.toggle("hidden",!on);$("txToggle").textContent=on?"Hide form":"Show form";if(!np)try{localStorage.setItem("wfp_tx_hidden",on?"0":"1")}catch(e){}}
$("txToggle").onclick=function(){txShow($("txBody").classList.contains("hidden"))};
try{if(localStorage.getItem("wfp_tx_hidden")==="1")txShow(false,1)}catch(e){}
function txReset(){txEdit=null;$("btnTx").textContent="Add transaction";$("btnTxCancel").classList.add("hidden");$("tQty").value="";$("tAmt").value="";$("tNote").value="";$("terr").textContent=""}
function txLoad(x){txShow(true,1);
 var s=byId(x.from),d=byId(x.to);if(!s)return;
 $("tType").value=isCan(x)?"can":x.type;typeUi();
 setSide("f",s);if(d)setSide("t",d);
 $("tFq").value=x.fq;$("tTq").value=x.tq||0;$("tQty").value=x.qty||Math.round(x.amt/s.price*10000)/10000;$("tDate").value=x.date||"";$("tNote").value=x.note||"";
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
 var P=wfpPairs(true);
 ["f","t"].forEach(function(p){
  var L=$(p==="f"?"tFrom":"tTo"),AP=$(p+"Aip"),A=$(p+"Act"),O=$(p+"Obj"),it=byId(L.value),aip=AP.value,act=A.value,obj=O.value;
  if(it&&!act){aip=it.aip;act=it.act;obj=it.obj}
  var aips=uniq(P.map(function(x){return x.aip}));if(aips.indexOf(aip)<0)aip="";
  var acts=uniq(P.filter(function(x){return!aip||x.aip===aip}).map(function(x){return x.act}));if(acts.indexOf(act)<0){act="";obj=""}
  if(!aip&&act){var m=uniq(P.filter(function(x){return x.act===act}).map(function(x){return x.aip}));if(m.length===1)aip=m[0]}
  if(aip&&!act&&acts.length===1)act=acts[0];
  AP.innerHTML=opts(aips,aip,"Select AIP code\u2026");
  A.innerHTML=opts(acts,act,"Select activity\u2026");
  var inL=function(i){return i.act===act&&(!aip||i.aip===aip)};
  var objs=uniq(yi().filter(inL).map(function(i){return i.obj})).sort(byObj);if(objs.indexOf(obj)<0)obj="";
  O.innerHTML=opts(objs,obj,"Select object of expenditure\u2026");$(p+"Acct").value=obj?codeOf(obj):"";
  var lines=yi().filter(function(i){return inL(i)&&i.obj===obj}),prev=L.value;
  L.innerHTML=lines.length?lines.map(function(i){return'<option value="'+i.id+'">'+esc(i.aip+" \u2013 "+i.desc+" (\u20b1"+money(i.price)+")")+'</option>'}).join(""):'<option value="">'+((act&&obj)?"No itemized budget line yet \u2013 add it in Office Budget first":"Select the AIP code, activity and object first")+'</option>';
  if(prev&&lines.some(function(i){return i.id===prev}))L.value=prev;
 });
 info();
}
function setSide(p,it){
 var L=$(p==="f"?"tFrom":"tTo");
 $(p+"Aip").value="";$(p+"Act").value="";$(p+"Obj").value="";L.value="";fillTx();
 $(p+"Aip").value=it.aip;fillTx();$(p+"Act").value=it.act;fillTx();$(p+"Obj").value=it.obj;fillTx();L.value=it.id;
}
["f","t"].forEach(function(p){
 var L=function(){return $(p==="f"?"tFrom":"tTo")};
 $(p+"Aip").onchange=function(){$(p+"Act").value="";$(p+"Obj").value="";L().value="";fillTx()};
 $(p+"Act").onchange=function(){$(p+"Obj").value="";if(!$(p+"Act").value)L().value="";fillTx()};
 $(p+"Obj").onchange=fillTx;
});
function info(){
 var it=byId($("tFrom").value),q=+$("tFq").value,bal=it?lineCalc(it).bal[q]:0;
 $("tInfo").textContent=it?"Unit price: "+money(it.price)+" — available in "+Q[q]+" Quarter: "+money(bal)+" (about "+(Math.floor(bal/it.price*100)/100)+" "+(it.unit||"units")+")":"";
 txAmt();
 var aug=$("tType").value==="aug",l1=objTotTxt($("fAct").value,$("fObj").value,(aug?"Augmented from \u2013 ":"")+"Total estimated budget \u2013 "),l2=aug?objTotTxt($("tAct").value,$("tObj").value,"Augmented to \u2013 Total estimated budget \u2013 "):"";
 $("tObjTot").innerHTML=(l1?"<div>"+esc(l1)+"</div>":"")+(l2?"<div>"+esc(l2)+"</div>":"");
}

function txAmt(){var it=byId($("tFrom").value),q=parseFloat($("tQty").value)||0;$("tAmt").value=(it&&q>0)?money(Math.round(q*it.price*100)/100):""}
$("tQty").addEventListener("input",info);
function typeUi(){
 var aug=$("tType").value==="aug";
 [].forEach.call(document.querySelectorAll(".augonly"),function(el){el.classList.toggle("hidden",!aug)});
 var pre=aug?"Augmented from – ":"";$("lFaip").textContent=pre+"AIP Code";$("lFa").textContent=pre+"Activities";$("lFo").textContent=pre+"Object of Expenditure";$("lFc").textContent=pre+"Account Code";$("lFrom").textContent=pre+"Item (budget line)";$("lFq").textContent=aug?"Augmented from quarter":($("tType").value==="can"?"Quarter":"Quarter of release");
}
$("tType").onchange=function(){typeUi();info()};$("tFrom").onchange=info;$("tFq").onchange=info;
$("tDate").value=new Date().toISOString().slice(0,10);
$("btnTx").onclick=function(){
 var type=$("tType").value,from=$("tFrom").value,fq=+$("tFq").value,to=$("tTo").value,tq=+$("tTq").value,qty=parseFloat($("tQty").value)||0,e=$("terr"),src=byId(from),amt=src?Math.round(qty*src.price*100)/100:0;
 if(!src){e.textContent="Select the Activity, Object of Expenditure and the item.";return}
 if(!(amt>0)){e.textContent="Enter a quantity greater than zero.";return}
 var keep=txs;if(txEdit)txs=txs.filter(function(t){return t.id!==txEdit});var av=lineCalc(src).bal[fq];txs=keep;
 if(type!=="can"&&amt>av+0.005){e.textContent="The amount of "+money(amt)+" ("+qty+" × "+money(src.price)+") is more than the "+Q[fq]+" Quarter balance of "+money(av)+".";return}
 if(type==="aug"){
  if(!byId(to)){e.textContent="Select the Activity, Object of Expenditure and item it is augmented to.";return}
  if(to===from&&tq===fq){e.textContent="Choose a different budget line or quarter to augment to.";return}
 }
 var rec={id:txEdit||uid(),type:type,from:from,fq:fq,to:type==="aug"?to:"",tq:tq,qty:qty,amt:amt,date:$("tDate").value,note:$("tNote").value.trim(),v:2};
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
var IH=["Year","AIP Code","Activities","Description","Object of Expenditure","Stock No.","Unit","Unit Price","Mode of Procurement","1st Quarter Qty","2nd Quarter Qty","3rd Quarter Qty","4th Quarter Qty","Remarks"];
function needX(){if(typeof XLSX==="undefined"){alert("The Excel library could not load. Check your internet connection and refresh the page.");return false}return true}
function nk(h){return String(h).toLowerCase().replace(/[^a-z0-9]/g,"")}
function nm(v){return parseFloat(String(v).replace(/[₱,\s]/g,""))}
$("obTpl").onclick=function(){
 if(!needX())return;
 var wb=XLSX.utils.book_new(),ws=XLSX.utils.aoa_to_sheet([IH]);ws["!cols"]=IH.map(function(h){return{wch:Math.max(14,h.length+2)}});ws["!cols"][2]={wch:40};ws["!cols"][3]={wch:40};ws["!cols"][4]={wch:36};
 XLSX.utils.book_append_sheet(wb,ws,"Items");
 var ins=[["HOW TO USE THIS TEMPLATE"],[""],["1. Type your items in the 'Items' sheet, one item per row, under the headings. Do not rename or delete the headings."],["2. Required: AIP Code, Activities, Description, Object of Expenditure, Unit Price (greater than 0) and a quantity in at least one quarter."],["3. Object of Expenditure must be spelled exactly as in the 'Lists' sheet (capital letters do not matter)."],["4. Mode of Procurement: Procurement or Non-Procurement (or leave blank). Stock No.: type N/A if none."],["5. Year is optional. If blank, the year currently selected in the app is used."],["6. Save the file, then in the app click 'Import from Excel'. Rows with problems are listed and skipped; rows you already imported are not duplicated."],[""],["EXAMPLE ROWS (do not copy the Account Code; it is filled in automatically)"],IH,
  [2026,"1000-001-1-001","Conduct of tourism awareness seminar","Diesel fuel",allObj()[0]?allObj()[0][1]:"","N/A","liter",65.5,"Non-Procurement",100,100,50,50,"Needed for the seminar"],
  [2026,"1000-001-1-001","Conduct of tourism awareness seminar","Bond paper, A4",allObj()[0]?allObj()[0][1]:"","N/A","ream",250,"Procurement",10,0,5,0,""]];
 var wi=XLSX.utils.aoa_to_sheet(ins);wi["!cols"]=[{wch:110}];XLSX.utils.book_append_sheet(wb,wi,"Instructions");
 var L=[["Object of Expenditure","Account Code","","Mode of Procurement"]];allObj().forEach(function(o,i){L.push([o[1],o[0],"",i<2?MODES[i]:""])});
 var wl=XLSX.utils.aoa_to_sheet(L);wl["!cols"]=[{wch:50},{wch:18},{wch:4},{wch:24}];XLSX.utils.book_append_sheet(wb,wl,"Lists");
 XLSX.writeFile(wb,"office-budget-import-template.xlsx");
};
$("obExp").onclick=function(){
 if(!needX())return;if(!items.length){alert("There are no items to export yet.");return}
 var rows=[IH].concat(items.slice().sort(function(a,b){return a.year-b.year}).map(function(i){return[i.year,i.aip,i.act,i.desc,i.obj,i.stock,i.unit,i.price,i.mode,i.q[0],i.q[1],i.q[2],i.q[3],i.remarks||""]}));
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
   var it={id:uid(),year:(yr>=2000&&yr<=2100)?yr:year,aip:aip,act:act,desc:desc,obj:hit[1],acct:hit[0],stock:String(pick("stockno","stock")).trim(),unit:String(pick("unit")).trim(),price:pr,mode:mo,remarks:String(pick("remarks","remark")).trim(),q:q};
   var key=[it.year,it.aip,it.desc,it.obj,it.price,it.q.join("|")].join("~").toLowerCase();
   if(seen[key]){dup++;return}seen[key]=1;good.push(it);
  });
  if(!good.length&&!bad.length){alert(dup?"All "+dup+" rows are already in the app.":"No rows found. Use the template and type your items under the headings.");return}
  var nw=good.filter(function(it){return!alloc.some(function(r){return+r.year===it.year&&r.act===it.act})}).length;
  var msg=good.length+" item(s) ready to import."+(nw?"\n"+nw+" of them use an Activity that is not in the Work Financial Plan for that year (add it there so it shows in the dropdowns).":"")+(dup?"\n"+dup+" duplicate row(s) will be skipped.":"")+(bad.length?"\n\n"+bad.length+" row(s) have problems and will be SKIPPED:\n"+bad.slice(0,12).join("\n")+(bad.length>12?"\n…and "+(bad.length-12)+" more":""):"");
  if(!good.length){alert(msg);return}
  if(!confirm(msg+"\n\nImport now?"))return;
  var cmis=0;
  good.forEach(function(it){var c=catByDesc(it.desc,it.year);if(!c){c={id:uid(),year:it.year,desc:it.desc,stock:it.stock,unit:it.unit,price:it.price};catalog.push(c)}else if(c.price!==it.price)cmis++;
   it.cid=c.id;it.desc=c.desc;it.stock=c.stock||"";it.unit=c.unit||"";it.price=c.price;items.push(it);if(years.indexOf(it.year)<0)years.push(it.year)});
  save(CATK,catalog);save(YK,years);save(KEY,items);fillYear();renderAll();refreshLists();
  alert("Imported "+good.length+" item(s)."+(cmis?"\n"+cmis+" row(s) use the Unit Price already in your Items list instead of the price in the file.":"")+(good.some(function(i){return i.year!==year})?"\nSome items belong to other years. Switch the Year selector to see them.":""));
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
 Q.forEach(function(q){h1.push(q+" Quarter","");h2.push("Quantity","Amount")});h1.push("Remarks");h2.push("");
 var rows=[["OFFICE BUDGET "+year],[meta.office||""],[],h1,h2],gq=0,gb=0,gqq=[0,0,0,0],ga=[0,0,0,0];
 list.forEach(function(it){
  var r=baseCells(it);gq+=tot(it);gb+=tot(it)*it.price;
  for(k=0;k<4;k++){var a=it.q[k]*it.price;gqq[k]+=it.q[k];ga[k]+=a;r.push(it.q[k],a)}
  r.push(it.remarks||"");rows.push(r);
 });
 var tr=["TOTAL","","","","","","","",gq,gb,""];for(k=0;k<4;k++)tr.push(gqq[k],ga[k]);tr.push("");rows.push(tr,[]);
 rows.push(["Prepared by: "+(meta.by||""),"","","","","","","","","","","Approved by: "+(meta.app||"")]);
 toXlsx("Office_Budget_"+year+".xlsx",[{n:"Office Budget",rows:rows,merges:headMerges(11,19,4,2,11,19),cols:[14,30,38,34,16,12,8,12,12,16,26,10,14,10,14,10,14,10,14,34],
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
 var lg=[["Date","Type","From (budget line)","From quarter","Augmented to (budget line)","To quarter","Quantity","Amount","Remarks"]];
 txs.forEach(function(x){
  var s=byId(x.from);if(!s||+s.year!==year)return;
  lg.push([x.date||"",isCan(x)?"Cancelled":(x.type==="rel"?"Release":"Augmentation"),lineLabel(s),Q[x.fq]+" Quarter",x.to?lineLabel(byId(x.to)):"",x.to?Q[x.tq]+" Quarter":"",x.qty||"",x.amt,x.note||""]);
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
var FS={ob:{aip:[],act:[],obj:[],mode:[],q:[]},bm:{aip:[],act:[],obj:[],mode:[],q:[]}},MODES=["Procurement","Non-Procurement"];
function modeSet(v){$("mode").value=v||"";return;var s=$("mode");if(v&&![].some.call(s.options,function(o){return o.value===v})){var o=document.createElement("option");o.value=o.textContent=v;s.appendChild(o)}s.value=v||""}
function fi(w){var f=FS[w];return yi().filter(function(it){return(!f.aip.length||f.aip.indexOf(it.aip)>=0)&&(!f.act.length||f.act.indexOf(it.act)>=0)&&(!f.obj.length||f.obj.indexOf(it.obj)>=0)&&(!f.mode.length||f.mode.indexOf(it.mode||"")>=0)&&(!f.q.length||f.q.some(function(k){return it.q[+k]>0}))})}
function uniq(a){return a.filter(function(v,i){return v&&a.indexOf(v)===i}).sort()}
function opts(vals,sel,all){var h='<option value="">'+all+'</option>';vals.forEach(function(v){h+='<option value="'+esc(v)+'"'+(v===sel?" selected":"")+'>'+esc(v)+'</option>'});return h}
function fillStock(){var u=uniq(items.map(function(i){return i.stock}).filter(function(s){return s!=="N/A"}));$("stockList").innerHTML='<option value="N/A">'+u.map(function(s){return'<option value="'+esc(s)+'">'}).join("")}
function buildBar(w){
 var el=$(w+"Dash");
 el.innerHTML='<h2 style="margin:0 0 10px">'+(w==="ob"?"Office Budget":"Budget Monitoring")+' dashboard</h2><div class="fbar"><div><label>AIP Code</label><div class="ms" data-f="aip"></div></div><div><label>Activities</label><div class="ms" data-f="act"></div></div><div><label>Object of Expenditure</label><div class="ms" data-f="obj"></div></div><div><label>Mode of Procurement</label><div class="ms" data-f="mode"></div></div><div><label>Quarter</label><div class="ms" data-f="q"></div></div><button data-clr="1">Clear filters</button></div><div class="fsum"></div><div class="kpis"></div><div class="dtw"></div>';
 el.addEventListener("change",function(e){var b=e.target.closest(".ms");if(!b||!b.dataset.f)return;var k=b.dataset.f;FS[w][k]=msVal(b);msNow(b);later(function(){if(k==="act"){FS[w].obj=[];FS[w].mode=[]}fillFilters(w);if(w==="ob")renderOB();else renderBM();renderDash(w)})});
 el.addEventListener("click",function(e){var mc=msClear(e);if(mc){var k=mc.dataset.f;FS[w][k]=[];if(k==="act"){FS[w].obj=[];FS[w].mode=[]}fillFilters(w);if(w==="ob")renderOB();else renderBM();renderDash(w);return}if(e.target.dataset.clr){FS[w]={aip:[],act:[],obj:[],mode:[],q:[]};fillFilters(w);if(w==="ob")renderOB();else renderBM();renderDash(w)}});
}
function fillFilters(w){
 var f=FS[w],all0=yi(),aips=uniq(all0.map(function(i){return i.aip}));f.aip=f.aip.filter(function(a){return aips.indexOf(a)>=0});var all=all0.filter(function(i){return!f.aip.length||f.aip.indexOf(i.aip)>=0}),acts=uniq(all.map(function(i){return i.act}));
 f.act=f.act.filter(function(a){return acts.indexOf(a)>=0});
 var inA=all.filter(function(i){return!f.act.length||f.act.indexOf(i.act)>=0}),objs=uniq(inA.map(function(i){return i.obj})).sort(byObj),ms=uniq(MODES.concat(inA.map(function(i){return i.mode})));
 f.obj=f.obj.filter(function(o){return objs.indexOf(o)>=0});f.mode=f.mode.filter(function(m){return ms.indexOf(m)>=0});
 var s=function(k){return $(w+"Dash").querySelector('[data-f="'+k+'"]')};
 msFill(s("aip"),L1(aips),f.aip,"All AIP codes");msFill(s("act"),L1(acts),f.act,"All activities");msFill(s("obj"),L1(objs),f.obj,"All objects of expenditure");msFill(s("mode"),L1(ms),f.mode,"All modes");msFill(s("q"),QO(),f.q,"All quarters");
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
 var on=[].concat(f.aip,f.act,f.obj,f.mode,qtxt(f.q));
 el.querySelector(".fsum").textContent="Showing "+list.length+" of "+yi().length+" items"+(on.length?" — filtered by: "+on.join(" › "):"");
}
function renderAll(){renderWF();if($("wfDash")&&$("wfDash").firstChild)renderWD();renderAN();renderIT();if(typeof renderAL==="function"&&$("alDash").firstChild)renderAL();fillStock();fillWfpSel();["ob","bm"].forEach(fillFilters);renderOB();fillTx();renderBM();paintMeta();renderDash("ob");renderDash("bm");if(bxReady)bxRender()}
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
var AF={aip:[],act:[],obj:[],q:[]},alEdit=null,ALR=[];
var wx={rows:[],eg:null};
function wxRender(){
 var box=$("wxBlocks");
 if(!wx.rows.length){box.innerHTML='<div class="fsum" style="margin:8px 0 0">Enter the AIP Code and Activity once, then pick each Object of Expenditure above. Every object gets its own block for the 1st to 4th quarter budget.</div>';wxTotals();return}
 box.innerHTML=wx.rows.map(function(r,ri){
  return'<fieldset class="xblk" data-ri="'+ri+'"><legend>'+esc(r.obj)+' <span style="font-weight:400">\u00b7 '+esc(codeOf(r.obj))+'</span></legend><div class="xst"></div><div class="xrow">'
   +[0,1,2,3].map(function(k){return'<div class="x2"><label>'+Q[k]+' Quarter</label><input data-q="'+k+'" type="number" min="0" step="0.01" value="'+esc(r.q[k])+'"></div>'}).join("")
   +'<div class="x2"><label>Total</label><input class="xt" readonly></div><div class="x2 xdel"><button type="button" class="d" data-xrm="1">Remove</button></div></div></fieldset>';
 }).join("");
 wxTotals();
}
function wxTotals(){
 var act=$("alAct").value.trim(),T=itemTotals(null),G=[0,0,0,0];
 [].forEach.call($("wxBlocks").querySelectorAll(".xblk"),function(bl){
  var r=wx.rows[+bl.dataset.ri],t=0,st="";
  for(var k=0;k<4;k++){var v=parseFloat(r.q[k])||0;t+=v;G[k]+=v;var ex=T[act+"|"+r.obj+"|"+k]||0;
   if(ex>0.005)st+="<div style='color:"+(ex-v>0.005?"#b3261e":"inherit")+"'>"+Q[k]+" Quarter \u2014 already itemized in Office Budget: "+money(ex)+(ex-v>0.005?" \u00b7 more than this WFP amount by "+money(ex-v):"")+"</div>"}
  bl.querySelector(".xt").value=t?money(t):"";bl.querySelector(".xst").innerHTML=st;
 });
 $("wxSum").textContent=wx.rows.length?(wx.rows.length+" object"+(wx.rows.length>1?"s":"")+" \u00b7 "+Q.map(function(q,k){return q+" "+money(G[k])}).join(" \u00b7 ")+" \u00b7 Total WFP: "+money(G[0]+G[1]+G[2]+G[3])):"";
}
function alClear(){["alAip","alAct","alObj"].forEach(function(i){$(i).value=""});wx.rows=[];wx.eg=null;$("alTitle").textContent="Add WFP entry";$("alSave").textContent="Add WFP entries";$("alCancel").classList.add("hidden");$("alErr").textContent="";wxRender()}
$("alCancel").onclick=alClear;
function wxObjPick(){
 var v=$("alObj").value.trim();if(!v)return;$("alErr").textContent="";
 var hit=allObj().filter(function(o){return o[1].toLowerCase()===v.toLowerCase()})[0];
 if(!hit){
  if(confirm("\""+v+"\" is not in the list. Add it as a new Object of Expenditure?")){var code=(prompt("Account Code for \""+v+"\":")||"").trim();
   if(code){if(allObj().some(function(o){return o[0]===code})){alert("That account code is already used by another object.");$("alObj").value="";return}custom.push([code,v]);save(OBJKEY,custom);fillObj($("obj").value);hit=[code,v]}}
  if(!hit){$("alObj").value="";return}
 }
 $("alObj").value="";
 if(wx.rows.some(function(r){return r.obj===hit[1]})){$("alErr").textContent="\""+hit[1]+"\" is already added below.";return}
 wx.rows.push({obj:hit[1],q:["","","",""]});wxRender();
 var bs=$("wxBlocks").querySelectorAll(".xblk"),l=bs[bs.length-1];if(l){var i=l.querySelector("[data-q]");if(i)i.focus()}
}
$("alObj").addEventListener("change",wxObjPick);
$("alObj").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();wxObjPick()}});
$("alObjAdd").onclick=function(){if(!$("alObj").value.trim()){$("alObj").focus();return}wxObjPick()};
$("wxBlocks").addEventListener("input",function(e){var q=e.target.dataset.q,bl=e.target.closest(".xblk");if(q===undefined||!bl)return;wx.rows[+bl.dataset.ri].q[+q]=e.target.value;wxTotals()});
$("wxBlocks").addEventListener("click",function(e){var b=e.target.closest("button");if(!b||!b.dataset.xrm)return;var bl=b.closest(".xblk");wx.rows.splice(+bl.dataset.ri,1);wxRender()});
$("alAct").addEventListener("input",wxTotals);
$("alSave").onclick=function(){
 var aip=$("alAip").value.trim(),act=$("alAct").value.trim(),e=$("alErr"),bad="";e.textContent="";
 if(!aip){e.textContent="Enter the AIP Code.";return}
 if(!act){e.textContent="Enter the Activity.";return}
 if(!wx.rows.length){e.textContent="Add at least one Object of Expenditure.";return}
 var recs=wx.rows.map(function(r){var q=r.q.map(function(v){return parseFloat(v)||0});if(!bad&&(q.some(function(x){return x<0})||!q.some(function(x){return x>0})))bad="Enter a WFP amount for at least one quarter of \""+r.obj+"\", or remove it.";return{obj:r.obj,q:q}});
 if(bad){e.textContent=bad;return}
 var eg=wx.eg,inYr=function(r){return+r.year===year};
 var orig=eg?alloc.filter(function(r){return inYr(r)&&r.act===eg.act&&(r.aip||"")===(eg.aip||"")}):[];
 var objs=recs.map(function(r){return r.obj}),gone=orig.filter(function(r){return objs.indexOf(r.obj)<0}),clash=[];
 recs.forEach(function(r){var x=alloc.filter(function(a){return inYr(a)&&a.act===act&&a.obj===r.obj&&orig.indexOf(a)<0})[0];if(x)clash.push(x)});
 var msg=[],nm2=function(a){return a.map(function(x){return x.obj}).join("; ")};
 if(clash.length)msg.push(clash.length+" object(s) already have a WFP entry under this activity ("+nm2(clash)+"). They will be replaced with the amounts you entered.");
 if(gone.length)msg.push(gone.length+" object(s) were removed from this activity ("+nm2(gone)+"). Their WFP entries will be deleted.");
 if(msg.length&&!confirm(msg.join("\n\n")+"\n\nContinue?"))return;
 alloc=alloc.filter(function(r){return clash.indexOf(r)<0&&gone.indexOf(r)<0});
 recs.forEach(function(r){var o=orig.filter(function(x){return x.obj===r.obj})[0];if(o){o.aip=aip;o.act=act;o.q=r.q}else alloc.push({id:uid(),year:year,aip:aip,act:act,obj:r.obj,q:r.q})});
 if(eg&&((eg.aip||"")!==aip||eg.act!==act)){var ch=items.filter(function(i){return+i.year===year&&i.act===eg.act});
  if(ch.length&&confirm(ch.length+" itemized budget line(s) in Office Budget still use the old AIP Code / Activity. Update them to match this WFP entry?")){ch.forEach(function(i){i.aip=aip;i.act=act});save(KEY,items)}}
 var H=sugGet();H.aip=H.aip.filter(function(v){return v!==aip});H.act=H.act.filter(function(v){return v!==act});sugSet(H);save(ALK,alloc);alClear();renderAll();
};
$("alObjEdit").onclick=function(e){e.preventDefault();objMgr();$("objDlg").showModal()};
$("alAip").addEventListener("change",function(){var v=$("alAip").value.trim();if(!v||$("alAct").value.trim())return;var m=alloc.filter(function(r){return r.aip===v})[0]||items.filter(function(i){return i.aip===v})[0];if(m)$("alAct").value=m.act});
function wxLoadGroup(aip,act){
 showBody("al");
 var rs=alloc.filter(function(r){return+r.year===year&&r.act===act&&(r.aip||"")===(aip||"")}).sort(function(a,b){return byObj(a.obj,b.obj)});
 wx.eg={aip:aip||"",act:act};wx.rows=rs.map(function(r){return{obj:r.obj,q:r.q.map(function(v){return v?String(v):""})}});
 $("alAip").value=aip||"";$("alAct").value=act;$("alObj").value="";$("alErr").textContent="";
 $("alTitle").textContent="Edit WFP \u2013 "+act;$("alSave").textContent="Save changes";$("alCancel").classList.remove("hidden");wxRender();window.scrollTo(0,0);
}
function wfLoad(r){wxLoadGroup(r.aip,r.act)}
wxRender();
var WFF={aip:[],act:[],obj:[],q:[]},WFN=0;
function wfFill(all){
 var aips=uniq(all.map(function(r){return r.aip}));WFF.aip=WFF.aip.filter(function(a){return aips.indexOf(a)>=0});
 var base=all.filter(function(r){return!WFF.aip.length||WFF.aip.indexOf(r.aip)>=0}),acts=uniq(base.map(function(r){return r.act}));WFF.act=WFF.act.filter(function(a){return acts.indexOf(a)>=0});
 var objs=uniq(base.filter(function(r){return!WFF.act.length||WFF.act.indexOf(r.act)>=0}).map(function(r){return r.obj})).sort(byObj);WFF.obj=WFF.obj.filter(function(o){return objs.indexOf(o)>=0});
 var f=$("wfFilt"),g=function(k){return f.querySelector('[data-wf="'+k+'"]')};
 msFill(g("aip"),L1(aips),WFF.aip,"All AIP codes");msFill(g("act"),L1(acts),WFF.act,"All activities");msFill(g("obj"),L1(objs),WFF.obj,"All objects of expenditure");msFill(g("q"),QO(),WFF.q,"All quarters");
}
$("wfFilt").addEventListener("change",function(e){var b=e.target.closest(".ms");if(!b||!b.dataset.wf)return;var k=b.dataset.wf;WFF[k]=msVal(b);msNow(b);later(function(){if(k==="act")WFF.obj=[];renderWF()})});
$("wfPrint").onclick=function(){if(!WFN){alert("There are no WFP entries to print. Check your filters.");return}paintMeta();window.print()};
$("wfFilt").addEventListener("click",function(e){var mc=msClear(e);if(mc){var k=mc.dataset.wf;WFF[k]=[];if(k==="act")WFF.obj=[];renderWF();return}if(e.target.dataset.wclr){WFF={aip:[],act:[],obj:[],q:[]};renderWF()}});
function renderWF(){
 var all=alloc.filter(function(r){return+r.year===year});wfFill(all);
 var rows=all.filter(function(r){return(!WFF.aip.length||WFF.aip.indexOf(r.aip)>=0)&&(!WFF.act.length||WFF.act.indexOf(r.act)>=0)&&(!WFF.obj.length||WFF.obj.indexOf(r.obj)>=0)&&(!WFF.q.length||WFF.q.some(function(k){return r.q[+k]>0}))}).sort(function(a,b){return a.act.localeCompare(b.act)||byObj(a.obj,b.obj)}),T=[0,0,0,0],sm=function(v){return v.reduce(function(a,b){return a+b},0)};
 var h="<thead><tr><th>AIP Code</th><th>Activity</th><th>Object of Expenditure</th><th>Account Code</th><th>1st Quarter</th><th>2nd Quarter</th><th>3rd Quarter</th><th>4th Quarter</th><th>Total</th><th class='act'></th></tr></thead><tbody>";
 rows.forEach(function(r){r.q.forEach(function(v,k){T[k]+=v});h+="<tr><td>"+esc(r.aip||"")+"</td><td>"+esc(r.act)+"</td><td>"+esc(r.obj)+"</td><td>"+esc(codeOf(r.obj))+"</td>"+r.q.map(function(v){return"<td class='n'>"+(v?money(v):"")+"</td>"}).join("")+"<td class='n'><b>"+money(sm(r.q))+"</b></td><td class='act' style='white-space:nowrap'><button data-w='e' data-id='"+r.id+"'>Edit</button><button class='d' data-w='d' data-id='"+r.id+"'>Delete</button></td></tr>"});
 h+=rows.length?"</tbody><tfoot><tr style='font-weight:700;background:var(--soft)'><td colspan='4'>TOTAL</td>"+T.map(function(v){return"<td class='n'>"+money(v)+"</td>"}).join("")+"<td class='n'>"+money(sm(T))+"</td><td class='act'></td></tr></tfoot>":"<tr><td colspan='10' class='empty'>"+(all.length?"No WFP entries match the filters.":"No WFP entries for "+year+" yet.")+"</td></tr></tbody>";
 $("wfTbl").innerHTML=h;WFN=rows.length;var on=[].concat(WFF.aip,WFF.act,WFF.obj,qtxt(WFF.q));$("wfSum").textContent="Showing "+rows.length+" of "+all.length+" entries for "+year+(on.length?" — filtered by: "+on.join(" › "):"");
}
$("wfTbl").addEventListener("click",function(e){var b=e.target.closest("button");if(!b||!b.dataset.w)return;var r=alloc.filter(function(x){return x.id===b.dataset.id})[0];if(!r)return;
 if(b.dataset.w==="e")wfLoad(r);else if(confirm("Delete this WFP entry?")){alloc=alloc.filter(function(x){return x.id!==r.id});save(ALK,alloc);if(wx.eg)alClear();renderAll()}});
function wfpChk(act,obj,q,ex){
 var keep=txs;if(ex)txs=txs.filter(function(t){return t.id!==ex});
 var w=0,sp=0;alloc.forEach(function(r){if(+r.year===year&&r.act===act&&r.obj===obj)w+=r.q[q]});
 yi().forEach(function(it){if(it.act===act&&it.obj===obj)sp+=lineCalc(it).r[q]});
 txs=keep;return{w:w,sp:sp}}
function alRows(){
 var m={},f=AF;
 var g=function(a,o){var k=a+"\u0001"+o;return m[k]||(m[k]={act:a,obj:o,a:[0,0,0,0],b:[0,0,0,0],s:[0,0,0,0],id:"",aips:[]})};
 alloc.filter(function(r){return +r.year===year}).forEach(function(r){var x=g(r.act,r.obj);x.id=r.id;if(r.aip&&x.aips.indexOf(r.aip)<0)x.aips.push(r.aip);for(var k=0;k<4;k++)x.a[k]+=r.q[k]});
 yi().forEach(function(it){var x=g(it.act,it.obj),c=lineCalc(it);if(it.aip&&x.aips.indexOf(it.aip)<0)x.aips.push(it.aip);for(var k=0;k<4;k++){x.b[k]+=c.b[k];x.s[k]+=c.r[k]}});
 return Object.keys(m).map(function(k){return m[k]}).filter(function(r){return(!f.aip.length||f.aip.some(function(a){return r.aips.indexOf(a)>=0}))&&(!f.act.length||f.act.indexOf(r.act)>=0)&&(!f.obj.length||f.obj.indexOf(r.obj)>=0)}).sort(function(x,y){return x.act.localeCompare(y.act)||byObj(x.obj,y.obj)});
}
var GR=[["Allocated","a"],["Budgeted","b"],["Actual spent","s"],["Allocation − Budgeted","d1"],["Budgeted − Spent","d2"],["Allocation − Spent","d3"]];
function dv(r){return{a:r.a,b:r.b,s:r.s,d1:r.a.map(function(x,k){return x-r.b[k]}),d2:r.b.map(function(x,k){return x-r.s[k]}),d3:r.a.map(function(x,k){return x-r.s[k]})}}
function buildAL(){
 $("alDash").innerHTML='<div class="bar"><h2 style="margin:0">Work Financial Plan (WFP) vs Actual Budget</h2><button class="p" id="alXls">Save to Excel</button></div><div class="fbar" style="margin-top:10px"><div><label>AIP Code</label><div class="ms" data-f="aip"></div></div><div><label>Activities</label><div class="ms" data-f="act"></div></div><div><label>Object of Expenditure</label><div class="ms" data-f="obj"></div></div><div><label>Quarter</label><div class="ms" data-f="q"></div></div><button data-clr="1">Clear filters</button></div><div class="fsum"></div><div id="alC1"></div><div id="alC2"></div>';
 var el=$("alDash");
 el.addEventListener("change",function(e){var b=e.target.closest(".ms");if(!b||!b.dataset.f)return;var k=b.dataset.f;AF[k]=msVal(b);msNow(b);later(function(){if(k==="act")AF.obj=[];renderAL()})});
 el.addEventListener("click",function(e){
  var t=e.target;
  var mc=msClear(e);if(mc){AF[mc.dataset.f]=[];if(mc.dataset.f==="act")AF.obj=[];renderAL();return}if(t.dataset.clr){AF={aip:[],act:[],obj:[],q:[]};renderAL();return}
  if(t.id==="alXls"){alXls();return}
  var r=ALR[t.dataset.i];if(!r)return;
  if(t.dataset.k==="d"){if(confirm("Delete this WFP entry?")){alloc=alloc.filter(function(x){return x.id!==r.id});save(ALK,alloc);renderAll()}return}
  var aip0=((alloc.filter(function(x){return x.id===r.id})[0]||{}).aip)||((yi().filter(function(i){return i.act===r.act&&i.obj===r.obj})[0]||{}).aip)||"";
  if(t.dataset.k==="e"&&r.id){wxLoadGroup(aip0,r.act)}
  else{alClear();showBody("al");$("alAip").value=aip0;$("alAct").value=r.act;wx.rows=[{obj:r.obj,q:["","","",""]}];wxRender()}
  tab("WF");window.scrollTo(0,0);
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
 var el=$("alDash"),f=AF,rows,qs;
 var allA=(function(){var s=AF;AF={aip:[],act:[],obj:[],q:[]};var r=alRows();AF=s;return r})();
 var hasA=function(r,v){return!v.length||v.some(function(a){return r.aips.indexOf(a)>=0})};
 var aips=uniq([].concat.apply([],allA.map(function(r){return r.aips})));f.aip=f.aip.filter(function(a){return aips.indexOf(a)>=0});
 var acts=uniq(allA.filter(function(r){return hasA(r,f.aip)}).map(function(r){return r.act}));f.act=f.act.filter(function(a){return acts.indexOf(a)>=0});
 var objs=uniq(allA.filter(function(r){return hasA(r,f.aip)&&(!f.act.length||f.act.indexOf(r.act)>=0)}).map(function(r){return r.obj})).sort(byObj);f.obj=f.obj.filter(function(o){return objs.indexOf(o)>=0});
 rows=alRows();qs=qsOf(f.q);ALR=rows;
 var s=function(k){return el.querySelector('[data-f="'+k+'"]')};
 msFill(s("aip"),L1(aips),f.aip,"All AIP codes");msFill(s("act"),L1(acts),f.act,"All activities");msFill(s("obj"),L1(objs),f.obj,"All objects of expenditure");msFill(s("q"),QO(),f.q,"All quarters");
 cmp($("alC1"),"Comparison 1: Work Financial Plan (WFP) vs Actual Budget Allocated","WFP","a","Actual Budget Allocated","b","% of WFP allocated",rows,qs,true);
 cmp($("alC2"),"Comparison 2: Actual Budget Allocated vs Actual Budget Spent","Actual Budget Allocated","b","Actual Budget Spent","s","% of allocated budget spent",rows,qs,false);
 var on=[].concat(f.aip,f.act,f.obj,qtxt(f.q));
 el.querySelector(".fsum").textContent="Year "+year+" — WFP = the lump-sum Work Financial Plan; Actual Budget Allocated = your encoded items (quantity × unit price); Actual Budget Spent = Release recorded in Budget Monitoring. A red balance means the second amount is more than the first"+(on.length?". Filtered by: "+on.join(" › "):"");
 fillSug();
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

/* ---------- Work Financial Plan dashboard ---------- */
var WD={aip:[],act:[],obj:[],q:[]};
function buildWD(){
 var el=$("wfDash");
 el.innerHTML='<h2 style="margin:0 0 10px">Work Financial Plan dashboard</h2><div class="fbar"><div><label>AIP Code</label><div class="ms" data-f="aip"></div></div><div><label>Activities</label><div class="ms" data-f="act"></div></div><div><label>Object of Expenditure</label><div class="ms" data-f="obj"></div></div><div><label>Quarter</label><div class="ms" data-f="q"></div></div><button data-clr="1">Clear filters</button></div><div class="fsum"></div><div class="kpis"></div><div class="wdw"></div>';
 el.addEventListener("change",function(e){var b=e.target.closest(".ms");if(!b||!b.dataset.f)return;var k=b.dataset.f;WD[k]=msVal(b);msNow(b);later(function(){if(k==="act")WD.obj=[];renderWD()})});
 el.addEventListener("click",function(e){var mc=msClear(e);if(mc){var k=mc.dataset.f;WD[k]=[];if(k==="act")WD.obj=[];renderWD();return}if(e.target.dataset.clr){WD={aip:[],act:[],obj:[],q:[]};renderWD()}});
}
function renderWD(){
 var el=$("wfDash"),f=WD,all=alloc.filter(function(r){return+r.year===year});
 var aips=uniq(all.map(function(r){return r.aip}));f.aip=f.aip.filter(function(a){return aips.indexOf(a)>=0});
 var b1=all.filter(function(r){return!f.aip.length||f.aip.indexOf(r.aip)>=0}),acts=uniq(b1.map(function(r){return r.act}));f.act=f.act.filter(function(a){return acts.indexOf(a)>=0});
 var b2=b1.filter(function(r){return!f.act.length||f.act.indexOf(r.act)>=0}),objs=uniq(b2.map(function(r){return r.obj})).sort(byObj);f.obj=f.obj.filter(function(o){return objs.indexOf(o)>=0});
 var rows=b2.filter(function(r){return!f.obj.length||f.obj.indexOf(r.obj)>=0}),s=function(k){return el.querySelector('[data-f="'+k+'"]')};
 msFill(s("aip"),L1(aips),f.aip,"All AIP codes");msFill(s("act"),L1(acts),f.act,"All activities");msFill(s("obj"),L1(objs),f.obj,"All objects of expenditure");msFill(s("q"),QO(),f.q,"All quarters");
 var qs=qsOf(f.q),m={},L=[],k;
 rows.forEach(function(r){var key=r.act+"\u0001"+r.obj,x=m[key];if(!x){x=m[key]={aip:r.aip||"",act:r.act,obj:r.obj,a:[0,0,0,0],b:[0,0,0,0],s:[0,0,0,0]};L.push(x)}for(var k=0;k<4;k++)x.a[k]+=r.q[k]||0});
 yi().forEach(function(it){var x=m[it.act+"\u0001"+it.obj];if(!x)return;var c=lineCalc(it);for(var k=0;k<4;k++){x.b[k]+=c.b[k];x.s[k]+=c.r[k]}});
 var sm=function(a){return qs.reduce(function(t,q){return t+a[q]},0)};
 var A=0,B=0,S=0,none=0,ac={};
 L.forEach(function(x){var a=sm(x.a),b=sm(x.b);A+=a;B+=b;S+=sm(x.s);ac[x.act]=1;if(a>0&&b<=0.005)none++});
 var p=function(v){return"\u20b1 "+money(v)},card=function(l,v,c){return'<div class="kpi"><span>'+l+'</span><b'+(c?' class="'+c+'"':"")+'>'+v+'</b></div>'};
 el.querySelector(".kpis").innerHTML=card("Total WFP (lump-sum)",p(A))+card("WFP entries",L.length)+card("Activities",Object.keys(ac).length)+card("Itemized in Office Budget",p(B))+card("WFP not yet itemized",p(A-B),A-B<-0.005?"neg":"")+card("Released",p(S))+card("% itemized",A?(B/A*100).toFixed(1)+"%":"\u2013")+card("Entries with no items yet",none);
 var on=[].concat(f.aip,f.act,f.obj,qtxt(f.q));
 el.querySelector(".fsum").textContent="Year "+year+" \u2014 WFP = lump-sum plan; Itemized = items encoded in Office Budget (quantity \u00d7 unit price); Released = releases recorded in Budget Monitoring. Showing "+L.length+" of "+all.length+" WFP entries"+(on.length?" \u2014 filtered by: "+on.join(" \u203a "):"")+". A red remaining amount means the items are more than the WFP.";
 var host=el.querySelector(".wdw");
 if(!L.length){host.innerHTML='<div class="empty">'+(all.length?"No WFP entries match the filters.":"No WFP entries for "+year+" yet. Add them in the form above.")+'</div>';return}
 var pct=function(a,b){var v=a?b/a*100:0;return"<div class='pct'><span class='tr'><i"+(v>100.005?" class='o'":"")+" style='width:"+Math.min(100,v).toFixed(1)+"%'></i></span><span>"+(a?v.toFixed(1)+"%":"\u2013")+"</span></div>"};
 var tr=function(l,a,b,r,bold,l0){var d=a-b;return"<tr"+(bold?" style='font-weight:700;background:var(--soft)'":"")+">"+(l0!==undefined?"<td>"+l0+"</td>":"")+"<td>"+l+"</td><td class='n'>"+money(a)+"</td><td class='n'>"+money(b)+"</td><td class='n'>"+money(r)+"</td><td class='n"+(d<-0.005?" neg":"")+"'>"+money(d)+"</td><td>"+pct(a,b)+"</td></tr>"};
 var th=function(first,extra){return"<thead><tr>"+(extra?"<th>"+extra+"</th>":"")+"<th>"+first+"</th><th>WFP</th><th>Itemized</th><th>Released</th><th>Remaining</th><th>% itemized</th></tr></thead>"};
 var tbl=function(t,first,body,foot,extra){return"<div><h3>"+t+"</h3><div class='wrap'><table class='dt'>"+th(first,extra)+"<tbody>"+body+"</tbody><tfoot>"+foot+"</tfoot></table></div></div>"};
 /* per quarter: bars + table */
 var mx=0,qb='<div class="wdleg"><span><b style="background:var(--brand)"></b>WFP</span><span><b style="background:#f59e0b"></b>Itemized</span><span><b style="background:#6366f1"></b>Released</span></div>',qr="";
 qs.forEach(function(q){var a=0,b=0;L.forEach(function(x){a+=x.a[q];b+=x.b[q]});mx=Math.max(mx,a,b)});
 var bar=function(lbl,c,v){return'<div class="wdb"><span>'+lbl+'</span><div class="tr"><i class="'+c+'" style="width:'+(mx&&v>0?Math.max(1,v/mx*100).toFixed(1):0)+'%"></i></div><span class="v">'+money(v)+'</span></div>'};
 qs.forEach(function(q){var a=0,b=0,r=0;L.forEach(function(x){a+=x.a[q];b+=x.b[q];r+=x.s[q]});qb+=bar(Q[q]+" Quarter","w",a)+bar("","b",b)+bar("","s",r);qr+=tr(Q[q]+" Quarter",a,b,r)});
 var qt=tbl("WFP per quarter","Quarter",qr,tr("TOTAL",A,B,S,1));
 /* per activity */
 var G={},GL=[];L.forEach(function(x){var g=G[x.act];if(!g){g=G[x.act]={act:x.act,aips:[],a:0,b:0,s:0};GL.push(g)}if(x.aip&&g.aips.indexOf(x.aip)<0)g.aips.push(x.aip);g.a+=sm(x.a);g.b+=sm(x.b);g.s+=sm(x.s)});
 GL.sort(function(x,y){return(x.aips[0]||"~").localeCompare(y.aips[0]||"~",undefined,{numeric:true})||x.act.localeCompare(y.act)});
 var ar=GL.map(function(g){return tr(esc(g.act),g.a,g.b,g.s,0,esc(g.aips.join(", ")))}).join("");
 var at=tbl("WFP per activity","Activity",ar,"<tr style='font-weight:700;background:var(--soft)'><td colspan='2'>TOTAL</td><td class='n'>"+money(A)+"</td><td class='n'>"+money(B)+"</td><td class='n'>"+money(S)+"</td><td class='n"+(A-B<-0.005?" neg":"")+"'>"+money(A-B)+"</td><td>"+pct(A,B)+"</td></tr>","AIP Code");
 /* per object */
 var or=uniq(L.map(function(x){return x.obj})).sort(byObj).map(function(o){var a=0,b=0,r=0;L.forEach(function(x){if(x.obj===o){a+=sm(x.a);b+=sm(x.b);r+=sm(x.s)}});return tr(esc(o),a,b,r)}).join("");
 var ot=tbl("WFP per Object of Expenditure","Object of Expenditure",or,tr("TOTAL",A,B,S,1));
 host.innerHTML='<div class="dtw"><div><h3>WFP vs itemized vs released, per quarter</h3>'+qb+'</div>'+qt+'</div><div style="margin-top:18px">'+at+'</div><div style="margin-top:18px">'+ot+'</div>';
}
buildWD();


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
 items=load(KEY,[]);txs=load(TXK,[]);meta=load(META,{});years=load(YK,[]);custom=load(OBJKEY,[]);alloc=load(ALK,[]);annual=load(ANK,[]);catalog=load(CATK,[]);catMigrate();objInit();
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
   o[YK]=JSON.stringify(m(L(YK),C(YK),String));o[OBJKEY]=JSON.stringify(m(L(OBJKEY),C(OBJKEY),function(x){return x[0]}));o[ALK]=JSON.stringify(m(L(ALK),C(ALK),idf));o[ANK]=JSON.stringify(m(L(ANK),C(ANK),idf));o[CATK]=JSON.stringify(m(L(CATK),C(CATK),idf));
   var lm=localStorage.getItem(META);o[META]=(lm&&lm!=="{}"&&lm!=="null")?lm:(d[META]||"{}");
   applyCloud(o);localStorage.setItem(MERGED,"1");cloudReady=true;pushCloud();
  }else if(d&&!cloudEmpty&&!dirty){applyCloud(d);localStorage.setItem(MERGED,"1");cloudReady=true;setBadge("☁ Synced","ok")}
  else{localStorage.setItem(MERGED,"1");cloudReady=true;pushCloud()} /* cloud empty, or unsynced edits on this device */
 }).catch(function(){setBadge("☁ Offline (saved on this device only)","bad")});
}
/* ---------- hide / show for every report ---------- */
var RT={};try{RT=JSON.parse(localStorage.getItem("wfp_rt")||"{}")||{}}catch(e){}
function rtApply(sec,key){var h=!!RT[key],b=sec.querySelector(":scope>.rbody"),btn=sec.querySelector('[data-rt="'+key+'"]');if(b)b.classList.toggle("hidden",h);sec.classList.toggle("rcollapsed",h);if(btn)btn.textContent=h?"Show":"Hide"}
function repWrap(sec,key){
 if(!sec||sec.dataset.rw)return;sec.dataset.rw="1";
 var head=[].filter.call(sec.children,function(c){return c.classList.contains("bar")||c.tagName==="H2"})[0];if(!head)return;
 var bar=head,h2=head.tagName==="H2"?head:head.querySelector("h2");
 if(head.tagName==="H2"){bar=document.createElement("div");bar.className="bar"+(sec.classList.contains("noprint")?" noprint":"");bar.style.marginBottom="8px";sec.insertBefore(bar,head);bar.appendChild(head);head.style.margin="0"}
 var btn=document.createElement("button");btn.type="button";btn.className="noprint rtbtn";btn.dataset.rt=key;btn.title="Hide or show this section";
 h2.insertAdjacentElement("afterend",btn);
 var body=document.createElement("div");body.className="rbody";
 [].slice.call(sec.children).forEach(function(c){if(c!==bar)body.appendChild(c)});sec.appendChild(body);
 btn.onclick=function(){RT[key]=!RT[key];try{localStorage.setItem("wfp_rt",JSON.stringify(RT))}catch(e){}rtApply(sec,key)};
 rtApply(sec,key);
}
function secOf(txt){var h=[].filter.call(document.querySelectorAll("section.card h2"),function(x){return x.textContent.trim()===txt})[0];return h&&h.closest("section")}
repWrap(secOf("Report details"),"det");repWrap($("obDash"),"obd");repWrap(secOf("Office Budget report"),"obr");repWrap($("bmDash"),"bmd");repWrap(secOf("Budget Monitoring report"),"bmr");repWrap($("lgSec"),"lg");repWrap($("wfDash"),"wfd");repWrap(secOf("Work Financial Plan entries"),"wfr");repWrap($("alDash"),"alr");repWrap(secOf("Office Annual Budget records"),"anr");

/* ---------- WFP form: Clear entry + reset suggestions ---------- */
var SUGK="wfp_sug_hide";
function sugGet(){try{var o=JSON.parse(localStorage.getItem(SUGK)||"null");return{aip:(o&&o.aip)||[],act:(o&&o.act)||[]}}catch(e){return{aip:[],act:[]}}}
function sugSet(o){try{localStorage.setItem(SUGK,JSON.stringify(o))}catch(e){}$("alSugBack").classList.toggle("hidden",!(o.aip.length||o.act.length))}
function sugKnown(){return{aip:uniq(alloc.map(function(r){return r.aip}).concat(items.map(function(i){return i.aip}))),act:uniq(alloc.map(function(r){return r.act}).concat(items.map(function(i){return i.act})))}}
function fillSug(){
 var H=sugGet(),K=sugKnown(),o=function(a){return a.map(function(v){return'<option value="'+esc(v)+'"></option>'}).join("")};
 $("alAipList").innerHTML=o(K.aip.filter(function(v){return H.aip.indexOf(v)<0}));$("alActList").innerHTML=o(K.act.filter(function(v){return H.act.indexOf(v)<0}));
 $("alSugBack").classList.toggle("hidden",!(H.aip.length||H.act.length));
}
function newIdentity(){["alAip","alAct","alObj"].forEach(function(id){var i=$(id);i.name="f"+Math.random().toString(36).slice(2);i.setAttribute("autocomplete","off")})}
newIdentity();
$("alReset").onclick=function(){var k=sugKnown();alClear();sugSet(k);newIdentity();fillSug();$("alAip").focus()};
$("alSugBack").onclick=function(e){e.preventDefault();sugSet({aip:[],act:[]});fillSug()};
})();

/* ===== Choose which columns to include when printing ===== */
(function(){
var $=function(id){return document.getElementById(id)};
var REP={
 obPrint:{key:"ob",title:"Office Budget report",tables:[{label:"",sel:"table.ob"}]},
 bmPrint:{key:"bm",title:"Budget Monitoring",tables:[{label:"Transactions table",sel:"table.lg"}],note:"The Budget Monitoring report columns are chosen with \u201cShow / hide fields in this report\u201d on the page. Here you choose the columns of the Transactions table."},
 wfPrint:{key:"wf",title:"Work Financial Plan",tables:[{label:"",sel:"#wfTbl"}]},
 anPrint:{key:"an",title:"Office Annual Budget",tables:[{label:"",sel:"#anTbl"}]}
};
var pending=null,restore=[],orig=window.print.bind(window);

function grid(t){
 var occ=[],cells=[],n=0;
 [].forEach.call(t.rows,function(tr,r){
  occ[r]=occ[r]||[];var c=0;
  [].forEach.call(tr.cells,function(td){
   while(occ[r][c])c++;
   var cs=td.colSpan||1,rs=td.rowSpan||1;
   for(var i=0;i<rs;i++){occ[r+i]=occ[r+i]||[];for(var j=0;j<cs;j++)occ[r+i][c+j]=1}
   cells.push({el:td,c:c,span:cs,head:!!td.closest("thead")});
   c+=cs;if(c>n)n=c;
  });
 });
 return{cells:cells,n:n};
}
function cols(t){
 var g=grid(t),out=[];
 for(var c=0;c<g.n;c++){
  var names=[],skip=false;
  g.cells.forEach(function(x){
   if(!x.head||c<x.c||c>=x.c+x.span)return;
   if(x.el.classList.contains("act")){skip=true;return}
   var s=x.el.textContent.replace(/\s+/g," ").trim();if(s&&names.indexOf(s)<0)names.push(s);
  });
  if(!skip)out.push({c:c,name:names.join(" \u2013 ")||("Column "+(c+1))});
 }
 return out;
}
function load(k){try{return JSON.parse(localStorage.getItem("wfp_print_cols_"+k))||[]}catch(e){return[]}}
function store(k,v){try{localStorage.setItem("wfp_print_cols_"+k,JSON.stringify(v))}catch(e){}}

function hide(t,hidden){
 var g=grid(t);
 g.cells.forEach(function(x){
  var h=0;for(var i=x.c;i<x.c+x.span;i++)if(hidden.indexOf(i)>=0)h++;
  if(!h)return;
  var el=x.el;
  if(h>=x.span){restore.push([el,el.style.display,null]);el.style.display="none"}
  else{restore.push([el,null,x.span]);el.colSpan=x.span-h}
 });
}
function undo(){
 restore.forEach(function(r){if(r[1]!==null)r[0].style.display=r[1];else r[0].colSpan=r[2]});
 restore=[];
}
window.addEventListener("afterprint",undo);

function dlg(){
 var d=$("prnDlg");if(d)return d;
 d=document.createElement("dialog");d.id="prnDlg";document.body.appendChild(d);return d;
}
function open(def){
 var d=dlg(),h='<h2 style="margin:0 0 4px">Print \u2013 choose columns</h2><p class="fsum" style="margin:0 0 8px">'+def.title+'. Tick the columns to include in the printed report. Your choice is remembered.</p>';
 if(def.note)h+='<p class="fsum" style="margin:0 0 8px">'+def.note+'</p>';
 var groups=[];
 def.tables.forEach(function(tb,ti){
  var t=document.querySelector(tb.sel);if(!t)return;
  var cs=cols(t);if(!cs.length)return;
  var off=load(def.key+"_"+ti);
  groups.push({t:t,cs:cs});
  if(tb.label)h+='<h3 style="margin:10px 0 6px;font-size:14px;color:var(--brand2)">'+tb.label+'</h3>';
  h+='<div class="pcgrid" data-ti="'+ti+'">'+cs.map(function(x){
   return'<label class="pcl"><input type="checkbox" data-c="'+x.c+'" data-n="'+x.name.replace(/"/g,"&quot;")+'"'+(off.indexOf(x.name)<0?" checked":"")+'> '+x.name.replace(/</g,"&lt;")+'</label>'}).join("")+'</div>';
 });
 if(!groups.length){orig();return}
 h+='<div class="pcerr err" id="pcErr"></div><div class="btns" style="justify-content:flex-end"><button type="button" id="pcAll" style="margin-right:auto">Select all</button><button type="button" id="pcNone">Clear all</button><button type="button" id="pcCancel">Cancel</button><button type="button" class="p" id="pcGo">Print</button></div>';
 d.innerHTML=h;
 var boxes=function(){return[].slice.call(d.querySelectorAll("input[type=checkbox]"))};
 $("pcAll").onclick=function(){boxes().forEach(function(b){b.checked=true})};
 $("pcNone").onclick=function(){boxes().forEach(function(b){b.checked=false})};
 $("pcCancel").onclick=function(){d.close()};
 $("pcGo").onclick=function(){
  var ok=true;
  d.querySelectorAll(".pcgrid").forEach(function(gr){if(!gr.querySelector("input:checked"))ok=false});
  if(!ok){$("pcErr").textContent="Select at least one column in each table.";return}
  d.querySelectorAll(".pcgrid").forEach(function(gr){
   var ti=+gr.dataset.ti,t=groups[ti].t,off=[],hid=[];
   gr.querySelectorAll("input").forEach(function(b){if(!b.checked){off.push(b.dataset.n);hid.push(+b.dataset.c)}});
   store(def.key+"_"+ti,off);hide(t,hid);
  });
  d.close();
  setTimeout(function(){orig();setTimeout(undo,1500)},50);
 };
 d.showModal();
}
document.addEventListener("click",function(e){
 var b=e.target.closest&&e.target.closest("button");
 pending=(b&&REP[b.id])||null;
 if(pending)setTimeout(function(){pending=null},0);
},true);
window.print=function(){
 if(pending){var d=pending;pending=null;open(d)}else orig();
};
})();
