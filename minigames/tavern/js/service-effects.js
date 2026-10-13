(function(root){
'use strict';
const host=document.createElement('div');host.id='table-effects';document.getElementById('game').append(host);const nodes=new Map();
function draw(game){
for(const [id,node] of nodes)if(!game.specialAt(id)){node.remove();nodes.delete(id);}
for(const e of game.specialEffects){let node=nodes.get(e.tableId);if(!node){node=document.createElement('button');node.className='table-curtain';node.dataset.curtain=e.tableId;node.setAttribute('aria-label',`${e.tableId+1}번 커튼`);const pos=root.TavernView.POS[e.tableId];node.style.left=(pos.x-18)+'px';node.style.top=(pos.y-48)+'px';node.innerHTML=`<span class="local-curtain-sheet"></span><span class="curtain-decoration"><b>체험학습 중</b></span><span class="curtain-sparkles">${[0,1,2,3,4,5].map(i=>`<img src="assets/${i%2?'ui/coin.png':'ui/heart.png'}" alt="" style="--i:${i}">`).join('')}</span>`;node.querySelector('.local-curtain-sheet').style.backgroundImage=`url("assets/${e.curtain}")`;node.onclick=()=>{game.interactSpecial(e.tableId);root.TavernView.render(true);};host.append(node);nodes.set(e.tableId,node);}
const frame=e.elapsed<.75?Math.min(5,Math.floor(e.elapsed/.15)):e.elapsed>e.duration-.75?Math.max(0,5-Math.floor((e.elapsed-(e.duration-.75))/.15)):5;
node.querySelector('.local-curtain-sheet').style.backgroundPosition=`${-frame*286}px 0`;node.classList.toggle('closed',e.elapsed>=.75&&e.elapsed<e.duration-.75);if(node.dataset.clicks!==String(e.clicks)){node.dataset.clicks=e.clicks;node.classList.remove('curtain-boing');void node.offsetWidth;if(e.clicks)node.classList.add('curtain-boing');}
}
}
root.TavernEffects={draw};
})(window);
