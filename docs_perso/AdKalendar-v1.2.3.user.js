
// ==UserScript==
// @name         AdKalendar
// @namespace    http://tampermonkey.net/
// @version      v1.2.4
// @description  Add new filters for ADKami calendar
// @author       Kanon
// @source       https://github.com/VincentBriand44/AdKalendar
// @downloadURL  https://raw.githubusercontent.com/VincentBriand44/AdKalendar/refs/heads/main/dist/AdKalendar.user.js
// @updateURL    https://raw.githubusercontent.com/VincentBriand44/AdKalendar/refs/heads/main/dist/AdKalendar.user.js
// @match        http*://adkami.com/agenda*
// @match        http*://*.adkami.com/agenda*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=adkami.com
// @grant        none
// ==/UserScript==

"use strict";(()=>{(()=>{let buttonsPos=document.querySelector("#pannel-list");if(!buttonsPos)return;let buttons=[{title:"Cacher 'VF'",id:"novf"},{title:"Cacher 'en pause'",id:"nopaused"},{title:"Cacher 'vu'",id:"nowatched"},{title:"Cacher 'oav/sp\xE9cial'",id:"nospecial"}];for(let button of buttons){let str=localStorage.getItem(button.id);str||localStorage.setItem(button.id,"false"),buttonsPos.style.flexWrap="wrap";let hideButton=document.createElement("label"),input=document.createElement("input"),p=document.createElement("p");hideButton.id=button.id,hideButton.classList.add("btn","right","agenda-filter-watch"),hideButton.style.display="flex",hideButton.style.gap="8px",hideButton.style.backgroundColor="rgba(0, 0, 0, 0.3)",hideButton.style.border="1px solid rgba(0, 0, 0, 0.8)",hideButton.style.margin="0px",hideButton.append(input),input.type="checkbox",input.checked=str==="true",hideButton.append(p),p.textContent=button.title,buttonsPos.append(hideButton),hideButton.addEventListener("click",()=>{clickHandler(),localStorage.setItem(button.id,input.checked.toString())})}})();var clickHandler=()=>{let episodes=document.querySelectorAll(".episode"),noVf=document.querySelector("#novf input"),noSpecial=document.querySelector("#nospecial input"),noPaused=document.querySelector("#nopaused input"),noWatched=document.querySelector("#nowatched input");!noVf||!noPaused||!noWatched||!noSpecial||episodes.forEach(episode=>{let episodeTitle=episode.querySelector(".epis"),hide=!1;episodeTitle?.textContent?.endsWith("vf")&&!episode.hidden&&(episode.style.display=noVf.checked?"none":"block",hide=noVf.checked),!episodeTitle?.textContent?.startsWith("Episode")&&!episode.hidden&&(episode.style.display=noSpecial.checked?"none":"block",hide=noSpecial.checked),episode.classList.contains("pause")&&!episode.hidden&&!hide&&(episode.style.display=noPaused.checked?"none":"block",hide=noPaused.checked),episode.classList.contains("vu")&&episodeTitle?.textContent?.startsWith("Episode")&&!episode.hidden&&!hide&&(episode.style.display=noWatched.checked?"none":"block")})},mutationCallback=mutationsList=>{for(let mutation of mutationsList)mutation.type==="attributes"&&mutation.attributeName==="hidden"&&clickHandler()},observer=new MutationObserver(mutationCallback),config={subtree:!0,attributes:!0},agenda=document.querySelector(".agenda-list");if(!agenda)throw new Error(".agenda-list not found");observer.observe(agenda,config);clickHandler();})();
