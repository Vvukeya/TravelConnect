import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';

const temp = mkdtempSync(path.join(os.tmpdir(),'travelconnect-integration-'));
process.env.TC_DATA_DIR=temp;
const [{createServer},{db},{passwordRecord},{randomUUID:unused}] = await Promise.all([
 import('../scripts/dev.mjs'), import('../server/db.mjs'), import('../server/security.mjs'), import('node:crypto')
]);
const server=createServer();
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const root=`http://127.0.0.1:${server.address().port}`;
const clients={guest:'',passenger:'',second:'',driver:'',admin:''};
async function call(client,endpoint,method='GET',body){
 const headers={'X-TravelConnect-Client':'web','Origin':root};
 if(body!==undefined)headers['Content-Type']='application/json';
 if(clients[client])headers.Cookie=clients[client];
 const res=await fetch(root+'/api/v1'+endpoint,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
 const setCookie=res.headers.get('set-cookie');if(setCookie)clients[client]=setCookie.split(';')[0];
 const value=await res.json();return {status:res.status,...value};
}
const in3days = new Date(Date.now()+3*86400000).toLocaleDateString('en-CA',{timeZone:'Africa/Johannesburg',year:'numeric',month:'2-digit',day:'2-digit'});
const tripInput={from:'Johannesburg',to:'Durban',date:in3days,depart:'08:00',price:350,seats:3,vehicle:'Toyota Corolla',pickup:'Park Station',dropoff:'Durban CBD'};
const carPhoto='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9dMTf0IAAAAASUVORK5CYII=';
const vehicleApplication={vehicleMake:'Toyota',vehicleModel:'Corolla',vehicleYear:2022,vehicleColor:'Silver',vehicleSeats:3,vehiclePlate:'CA 12345',vehiclePhoto:carPhoto};
test('TravelConnect integration: real accounts, permissions, seats, cancellations, messaging and persistence',async t=>{
 await t.test('health and static frontend',async()=>{
  assert.equal((await call('guest','/health')).status,200);
  const index=await fetch(root+'/index.html');assert.equal(index.status,200);assert.match(await index.text(),/TravelConnect/);
  const traversal=await fetch(root+'/../server/db.mjs');assert.notEqual(traversal.status,200);
 });
 await t.test('account validation and registration',async()=>{
  assert.equal((await call('guest','/auth/register','POST',{name:'P',email:'bad',password:'short'})).status,400);
  const x=await call('passenger','/auth/register','POST',{name:'Passenger One',email:'passenger@example.test',password:'passphrase123!'});assert.equal(x.status,201);assert.equal(x.user.role,'passenger');
  const x2=await call('second','/auth/register','POST',{name:'Passenger Two',email:'second@example.test',password:'passphrase123!'});assert.equal(x2.status,201);
  const d=await call('driver','/auth/register','POST',{name:'Safe Driver',email:'driver@example.test',password:'passphrase123!'});assert.equal(d.status,201);
  assert.equal((await call('guest','/auth/login','POST',{email:'passenger@example.test',password:'wrong'})).status,401);
  assert.equal((await call('guest','/auth/firebase/config')).enabled,false);
  assert.equal((await call('guest','/auth/google','POST',{idToken:'fake-id-token'})).status,503);
  assert.equal((await call('passenger','/auth/me')).user.email,'passenger@example.test');
  assert.equal((await call('guest','/bookings')).status,401);
 });
 await t.test('driver application and role-based manual approval',async()=>{
  assert.equal((await call('driver','/driver/trips','POST',tripInput)).status,403);
  assert.equal((await call('driver','/driver/apply','POST',{...vehicleApplication,vehiclePhoto:'data:text/html;base64,PHNjcmlwdD4='})).status,400);
  const application=await call('driver','/driver/apply','POST',vehicleApplication);assert.equal(application.status,200);assert.equal(application.user.vehicle_make,'Toyota');assert.equal(application.user.hasVehiclePhoto,true);
  const driverId=application.user.id;
  const privatePhoto=await fetch(root+'/api/v1/drivers/'+driverId+'/vehicle-photo');assert.equal(privatePhoto.status,403);
  const ownerPhoto=await fetch(root+'/api/v1/drivers/'+driverId+'/vehicle-photo',{headers:{Cookie:clients.driver}});assert.equal(ownerPhoto.status,200);assert.equal(ownerPhoto.headers.get('content-type'),'image/png');
  assert.equal((await call('driver','/driver/trips','POST',tripInput)).status,403);
  assert.equal((await call('passenger','/admin/stats')).status,403);
  assert.equal((await call('passenger','/admin/overview')).status,403);
  const salt=passwordRecord('verylongadminpassword!'),id=randomUUID();
  db.prepare("INSERT INTO users(id,name,email,password_salt,password_hash,role,created_at) VALUES(?,?,?,?,?,'admin',?)").run(id,'Admin One','admin@example.test',salt.salt,salt.hash,new Date().toISOString());
  const login=await call('admin','/auth/login','POST',{email:'admin@example.test',password:'verylongadminpassword!'});assert.equal(login.status,200);
  const reqs=await call('admin','/admin/drivers');assert.equal(reqs.data.length,1);
  assert.equal(reqs.data[0].vehicle_color,'Silver');assert.equal(reqs.data[0].vehicle_photo_mime,'image/png');
  const ov=await call('admin','/admin/overview');assert.equal(ov.status,200);assert.ok(ov.data.stats.users>=4);assert.equal(ov.data.stats.driversPending,1);assert.ok(Array.isArray(ov.data.recentActivity));
  assert.equal((await call('admin',`/admin/drivers/${reqs.data[0].id}/approve`,'POST',{})).status,200);
  assert.equal((await call('driver','/auth/me')).user.driver_status,'approved');
 });
 let tripId,bookingA,bookingB;
 await t.test('real published trip is visible to everyone and can be booked',async()=>{
  const created=await call('driver','/driver/trips','POST',tripInput);assert.equal(created.status,201);tripId=created.data.id;
  assert.match(created.data.vehiclePhotoUrl,/vehicle-photo$/);
  const publicPhoto=await fetch(root+created.data.vehiclePhotoUrl);assert.equal(publicPhoto.status,200);assert.equal(publicPhoto.headers.get('content-type'),'image/png');
  assert.equal((await call('guest','/trips?from=Johannesburg&to=Durban')).data.length,1);
  assert.equal((await call('guest','/trips?from=Cape%20Town')).data.length,0);
  assert.equal((await call('driver','/bookings','POST',{tripId,seats:1,requestId:randomUUID()})).status,400);
  const a=await call('passenger','/bookings','POST',{tripId,seats:2,requestId:'passenger-one-reservation'});assert.equal(a.status,201);bookingA=a.data.id;
  assert.equal(a.data.total,700);
  const left=await call('guest','/trips');assert.equal(left.data[0].seats,1);
  assert.equal((await call('second','/bookings','POST',{tripId,seats:2,requestId:'passenger-two-reservation'})).status,409);
  const b=await call('second','/bookings','POST',{tripId,seats:1,requestId:'passenger-two-reservation'});assert.equal(b.status,201);bookingB=b.data.id;
  assert.equal((await call('second','/bookings','POST',{tripId,seats:1,requestId:'passenger-two-reservation'})).data.id,bookingB);
  assert.equal((await call('guest','/trips')).data.length,0); // no free seats
  assert.equal((await call('passenger','/bookings')).data.length,1);
  assert.equal((await call('driver','/driver/bookings')).data.length,2);
  const summary=await call('admin','/admin/overview');assert.equal(summary.data.stats.bookingsReserved,2);assert.equal(summary.data.stats.seatsReserved,3);assert.equal(summary.data.stats.faresReserved,1050);assert.equal(summary.data.recentBookings.length,2);assert.equal(summary.data.recentTrips[0].driver,'Safe Driver');
  assert.equal((await call('driver',`/driver/trips/${tripId}`,'DELETE')).status,409); // active bookings prevent trip cancellation
 });
 await t.test('trip conversations are private',async()=>{
  assert.equal((await call('guest',`/trips/${tripId}/messages`)).status,401);
  assert.equal((await call('passenger',`/trips/${tripId}/messages`,'POST',{message:'Meet at Park Station'})).status,201);
  let msgs=await call('driver',`/trips/${tripId}/messages`);assert.equal(msgs.data.length,1);assert.equal(msgs.data[0].content,'Meet at Park Station');
  assert.equal((await call('driver',`/trips/${tripId}/messages`,'POST',{message:'Understood, arriving at 07:45'})).status,201);
  msgs=await call('second',`/trips/${tripId}/messages`);assert.equal(msgs.data.length,2);
 });
 await t.test('cancelling a booking restores availability',async()=>{
  const can=await call('passenger',`/bookings/${bookingA}/cancel`,'POST',{});assert.equal(can.status,200);
  assert.equal((await call('guest','/trips')).data[0].seats,2);
  assert.equal((await call('passenger',`/bookings/${bookingA}/cancel`,'POST',{})).status,200);
  assert.equal((await call('guest','/trips')).data[0].seats,2);
  assert.equal((await call('second',`/bookings/${bookingB}/cancel`,'POST',{})).status,200);
  assert.equal((await call('guest','/trips')).data[0].seats,3);
  const login=await call('passenger','/auth/logout','POST',{});assert.equal(login.status,200);
  assert.equal((await call('passenger','/bookings')).status,401);
  assert.equal((await call('passenger','/auth/login','POST',{email:'passenger@example.test',password:'passphrase123!'})).status,200);
  assert.equal((await call('passenger','/bookings')).data.length,1);
 });
 await t.test('a driver can cancel an empty journey',async()=>{
  assert.equal((await call('driver',`/driver/trips/${tripId}`,'DELETE',{})).status,200);
  assert.equal((await call('guest','/trips')).data.length,0);
 });
 await t.test('security headers and disallowed cross-site write',async()=>{
  const res=await fetch(root+'/index.html');assert.equal(res.headers.get('x-frame-options'),'DENY');
  const cross=await fetch(root+'/api/v1/auth/login',{method:'POST',headers:{'X-TravelConnect-Client':'web','Content-Type':'application/json','Origin':'https://evil.example'},body:JSON.stringify({email:'passenger@example.test',password:'passphrase123!'})});assert.equal(cross.status,403);
 });
});
test.after(()=>{server.close();db.close();rmSync(temp,{recursive:true,force:true})});
