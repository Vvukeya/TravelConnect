import { backup } from 'node:sqlite';
import { mkdirSync, chmodSync, existsSync } from 'node:fs';
import path from 'node:path';
import { db, dataDir } from '../server/db.mjs';

const backupDir=path.join(dataDir,'backups');
mkdirSync(backupDir,{recursive:true,mode:0o700});
const stamp=new Date().toISOString().replace(/[.:]/g,'-');
const destination=path.join(backupDir,`travelconnect-${stamp}.sqlite`);
if(existsSync(destination))throw new Error('Backup already exists; retry in a moment');
try{
 await backup(db,destination);
 chmodSync(destination,0o600);
 console.log('Database backup saved:',destination);
 console.log('Copy backups to a separate secure location regularly. Restores must be tested before launch.');
}catch(error){console.error('Backup failed:',error.message);process.exitCode=1}
