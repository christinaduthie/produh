import { Router } from 'express';
import PptxGenJS from 'pptxgenjs';


const r = Router();


r.post('/release-notes', async (_req,res)=>{
// For brevity, return simple HTML; in practice, write to Confluence.
const html = `<h2>Release Notes</h2><ul><li>Feature A</li><li>Fix B</li></ul>`;
res.json({ html });
});


r.post('/decks', async (_req,res)=>{
const pptx = new PptxGenJS();
const slide = pptx.addSlide();
slide.addText('ProDuh! – Exec Deck', { x:1, y:1, fontSize:28 });
const file = `/tmp/produh-exec-${Date.now()}.pptx`;
await pptx.writeFile({ fileName: file });
res.json({ file });
});


export default r;