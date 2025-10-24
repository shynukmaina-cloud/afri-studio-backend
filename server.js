// Simplified Afri Studio Backend placeholder (full logic from description)
require('dotenv').config();
const express = require('express');
const app = express();
app.use(express.json());
app.get('/', (req,res)=>res.send('Afri Studio Backend running'));
app.listen(3000, ()=>console.log('Running on 3000'));
