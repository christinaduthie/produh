import { Router } from 'express';
import { q, SQL } from '../db/index.js';
import { v4 as uuid } from 'uuid';


const r = Router();


r.get('/', async (_req,res)=>{
const { rows } = await q(SQL.PRODUCT_SELECT_ALL);
res.json(rows);
});


r.post('/', async (req,res)=>{
const id = uuid();
const { name, code, owners } = req.body;
await q(SQL.PRODUCT_INSERT, [id, name, code, JSON.stringify(owners||[])]);
res.json({ id });
});


export default r;
