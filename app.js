// 原生 JavaScript；金额以整数“分”保存，避免小数统计误差。
'use strict';
const KEY='shiguang-ledger-v1';
const categories={expense:['餐饮美食','交通出行','购物消费','居家生活','休闲娱乐','医疗健康','学习成长','其他支出'],income:['工资薪酬','兼职收入','投资收益','礼金红包','其他收入']};
const colors=['#447660','#d6a16e','#8fae8a','#7e9fae','#c8bc8b','#b48c9b','#97a69d','#d7dcd3'];
const $=id=>document.getElementById(id);
function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
const money=n=>'¥'+(n/100).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
let entries=[],type='expense',ready=true,timer;
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(timer);timer=setTimeout(()=>$('toast').classList.remove('show'),4500);}
function validDate(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00');return !isNaN(d)&&d.getFullYear()===+s.slice(0,4)&&d.getMonth()+1===+s.slice(5,7)&&d.getDate()===+s.slice(8,10);}
function valid(list){return Array.isArray(list)&&list.length<=100000&&list.every(e=>e&&typeof e.id==='string'&&e.id.length<=100&&['income','expense'].includes(e.type)&&Number.isSafeInteger(e.cents)&&e.cents>0&&e.cents<=99999999999&&validDate(e.date)&&categories[e.type].includes(e.category)&&typeof e.note==='string'&&e.note.length<=100)&&new Set(list.map(e=>e.id)).size===list.length;}
function save(next){if(!ready){toast('原数据无法读取，请先导出备份，再导入有效文件恢复。');return false;}try{localStorage.setItem(KEY,JSON.stringify(next));entries=next;render();return true;}catch{toast('保存失败：浏览器存储不可用或空间已满，请先导出备份。');return false;}}
function setCategories(){$('category').replaceChildren(...categories[type].map(c=>new Option(c,c)));}
function el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function render(){
 const monthly=entries.filter(e=>e.date.slice(0,7)===$('month').value),ins=monthly.filter(e=>e.type==='income'),outs=monthly.filter(e=>e.type==='expense');
 const sum=list=>list.reduce((n,e)=>n+e.cents,0);
 $('income').textContent=money(sum(ins));$('expense').textContent=money(sum(outs));$('balance').textContent=money(sum(ins)-sum(outs));$('ic').textContent='共 '+ins.length+' 笔收入';$('ec').textContent='共 '+outs.length+' 笔支出';
 const visible=monthly.filter(e=>$('filter').value==='all'||e.type===$('filter').value).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
 $('count').textContent=visible.length+' 笔';$('records').replaceChildren();$('empty').hidden=visible.length>0;
 visible.forEach(e=>{const row=el('tr');const name=row.insertCell();name.textContent=e.category;if(e.note)name.append(el('small',e.note));row.insertCell().textContent=e.date;row.insertCell().textContent=e.type==='income'?'收入':'支出';const amount=row.insertCell();amount.textContent=(e.type==='income'?'+':'−')+money(e.cents);amount.className=e.type;const del=el('button','删除','delete');del.type='button';del.setAttribute('aria-label','删除 '+e.date+' '+e.category+' '+money(e.cents));del.onclick=()=>{if(confirm('确定删除 '+e.category+' '+money(e.cents)+' 这笔账吗？')&&save(entries.filter(item=>item.id!==e.id)))toast('账目已删除');};row.insertCell().append(del);$('records').append(row);});
 chart(outs,sum(outs));
}
function chart(list,total){const area=$('chart');area.replaceChildren();if(!total){const box=el('div',undefined,'empty');box.append(el('div','◌'),el('h3','还没有支出记录'),el('p','添加一笔支出，看看你的消费分布。'));area.append(box);return;}
 const groups=categories.expense.map((name,i)=>({name,color:colors[i],cents:list.filter(e=>e.category===name).reduce((n,e)=>n+e.cents,0)})).filter(g=>g.cents).sort((a,b)=>b.cents-a.cents);
 let start=0;const slices=groups.map(g=>{const end=start+g.cents/total*100;const s=g.color+' '+start+'% '+end+'%';start=end;return s;});
 const donut=el('div',undefined,'donut');donut.style.background='conic-gradient('+slices.join(',')+')';donut.setAttribute('role','img');donut.setAttribute('aria-label','本月支出分类占比，详细数值见下方');const hole=el('div',undefined,'hole');hole.append(el('span','本月总支出'),el('strong',money(total)));donut.append(hole);area.append(donut);
 const legend=el('div',undefined,'legend');groups.forEach(g=>{const row=el('div',undefined,'legend-row'),dot=el('i');dot.style.background=g.color;row.append(dot,el('span',g.name),el('span',money(g.cents)),el('small',(g.cents/total*100).toFixed(1)+'%'));legend.append(row);});area.append(legend);
}
$('date').value=today();$('month').value=today().slice(0,7);
try{const raw=localStorage.getItem(KEY);if(raw!==null){const data=JSON.parse(raw);if(!valid(data))throw Error();entries=data;}}catch{ready=false;toast('无法读取本地数据，已停止写入以保护原记录。请导出备份或导入有效文件恢复。');}
document.querySelectorAll('[data-type]').forEach(button=>button.addEventListener('click',()=>{type=button.dataset.type;document.querySelectorAll('[data-type]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});setCategories();}));
$('form').addEventListener('submit',event=>{event.preventDefault();const raw=$('amount').value;if(!/^\d+(\.\d{1,2})?$/.test(raw)||!validDate($('date').value)){toast('请输入有效日期与金额（最多两位小数）。');return;}const cents=Math.round(Number(raw)*100);if(!Number.isSafeInteger(cents)||cents<=0||cents>99999999999){toast('金额须在 0.01 至 999,999,999.99 元之间。');return;}const entry={id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),type,cents,category:$('category').value,date:$('date').value,note:$('note').value.trim()};const previous=$('month').value;$('month').value=entry.date.slice(0,7);if(save([...entries,entry])){$('amount').value='';$('note').value='';toast('已保存，账本又完整了一点');$('amount').focus();}else $('month').value=previous;});
$('month').addEventListener('change',()=>{if(!$('month').value)$('month').value=today().slice(0,7);render();});$('filter').addEventListener('change',render);
$('export').onclick=()=>{try{const raw=ready?JSON.stringify({version:1,entries},null,2):localStorage.getItem(KEY)||'[]';const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));const link=el('a');link.href=url;link.download='拾光记账备份-'+today()+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{toast('无法读取浏览器存储，备份失败。');}};
$('import').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>20*1024*1024)throw Error();const data=JSON.parse(await file.text());const list=Array.isArray(data)?data:data&&data.version===1?data.entries:null;if(!valid(list))throw Error();if(confirm('导入 '+list.length+' 笔记录将替换全部原账目，是否继续？建议先导出备份。')){const previous=ready;ready=true;if(save(list))toast('备份已恢复');else ready=previous;}}catch{toast('导入失败，请选择本网站导出的有效 JSON 备份。');}finally{event.target.value='';}});
setCategories();render();
