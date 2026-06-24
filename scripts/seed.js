require('dotenv').config();
const mongoose=require('mongoose'); const bcrypt=require('bcryptjs');
const Admin=require('../models/Admin'); const Product=require('../models/Product'); const Setting=require('../models/Setting');
const uri=process.env.MONGODB_URI||'mongodb://127.0.0.1:27017/jorero_shop';
const products=[];
async function seed(){await mongoose.connect(uri); const username=process.env.ADMIN_USERNAME||'admin', password=process.env.ADMIN_PASSWORD||'12345'; await Admin.findOneAndUpdate({username},{username,password:await bcrypt.hash(password,10),role:'super_admin',active:true},{upsert:true}); if(await Product.countDocuments()===0) await Product.insertMany(products); await Setting.findOneAndUpdate({key:'site'},{key:'site',heroEyebrow:'JORERO ONLINE SHOP',heroTitle:'Wear your mood',heroSubtitle:'نحن متخصصين في تصنيع وبيع الملابس الرجالي والحريمي والأطفالي. هنوفر عليكم لف 3 محلات في محل واحد.',heroPrimaryText:'تسوق الآن',homeNoteTitle:'المصنع والمحل في مكان واحد',homeNoteText:'بنصنع ونورد جملة وقطاعي عشان تلاقي ذوقك ومقاسك بسهولة.',deliveryPrice:50,defaultSizes:['2','4','6','8','S','M','L','XL','XXL','3XL','4XL'],heroImages:[]},{upsert:true,setDefaultsOnInsert:true}); console.log('Seed done: admin / 12345'); await mongoose.disconnect();}
seed().catch(e=>{console.error(e);process.exit(1)});
