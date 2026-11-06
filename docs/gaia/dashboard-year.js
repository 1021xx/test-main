(()=>{
 const board=document.querySelector('.dashboard-board');if(!board)return;
 const year=String(new Date().getFullYear()),shortYear=year.slice(-2);
 const walker=document.createTreeWalker(board,NodeFilter.SHOW_TEXT);let node;
 while(node=walker.nextNode()){
  node.nodeValue=node.nodeValue.replace(/\b(?:19|20)\d{2}(?=[.\/-]\d{1,2}[.\/-]\d{1,2}|년)/g,year).replace(/\b\d{2}(?=\.\d{2}\.\d{2}\b)/g,shortYear);
 }
})();
