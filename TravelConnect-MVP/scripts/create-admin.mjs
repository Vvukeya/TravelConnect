import {randomUUID} from 'node:crypto';
import {db,audit} from '../server/db.mjs';
import {normalizeEmail,validName,validPassword,passwordRecord,iso} from '../server/security.mjs';
try {
 const email=normalizeEmail(process.env.TC_ADMIN_EMAIL);
 const name=validName(process.env.TC_ADMIN_NAME||'TravelConnect Administrator');
 const pwd=validPassword(process.env.TC_ADMIN_PASSWORD);
 if(db.prepare('SELECT 1 FROM users WHERE email=?').get(email))throw Error('Email already registered; choose a dedicated admin email');
 const pass=passwordRecord(pwd),id=randomUUID();
 db.prepare("INSERT INTO users(id,name,email,password_salt,password_hash,role,created_at) VALUES(?,?,?,?,?,'admin',?)").run(id,name,email,pass.salt,pass.hash,iso());audit(id,'admin.bootstrap');
 console.log('Created admin:',email);
} catch(err) {console.error('Admin creation failed:',err.message);process.exitCode=1}
