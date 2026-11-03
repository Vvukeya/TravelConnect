import {randomUUID} from 'node:crypto';
import {db, transaction, audit} from './db.mjs';
import {weatherService} from './weather.mjs';
import {aiService} from './ai.mjs';
import {ApiError,iso,must,safeString,normalizeEmail,validName,validPassword,integer,validateDate,validateTime,passwordRecord,passwordValid,hashToken,randomToken,parseCookies,uuid,nowJohannesburg} from './security.mjs';

const USER_FIELDS='id,name,email,phone,role,driver_status,vehicle,created_at';
const one=(sql,...params)=>db.prepare(sql).get(...params);
const all=(sql,...params)=>db.prepare(sql).all(...params);
const redact=u=>u?Object.fromEntries(['id','name','email','phone','role','driver_status','vehicle','created_at'].map(k=>[k,u[k]])):null;
const SESSION_DAYS=7;
const secure=(req)=>Boolean(req.socket.encrypted) || (process.env.TRUST_PROXY==='1' && String(req.headers['x-forwarded-proto']).split(',')[0].trim()==='https');
const cookie=(value,req,age=SESSION_DAYS*24*60*60)=>`tc_session=${value}; Path=/api/v1; HttpOnly; SameSite=Strict; Max-Age=${age}${secure(req)?'; Secure':''}`;
function send(res,status,data,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(data));}
function userFor(req){const token=parseCookies(req.headers.cookie||'').tc_session;if(!token||!/^[a-f0-9]{80}$/.test(token))return null;return one(`SELECT u.${USER_FIELDS.replaceAll(',',',u.')} FROM users u JOIN sessions s ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?`,hashToken(token),iso())||null;}
function auth(user){must(user,'Please sign in to continue',401);return user;}
function role(user,wanted){auth(user);must(wanted.includes(user.role),'You do not have permission for this action',403);return user;}
function canMessage(user,tripId){auth(user);if(user.role==='admin')return true;if(one('SELECT 1 FROM trips WHERE id=? AND driver_id=?',tripId,user.id))return true;return Boolean(one("SELECT 1 FROM bookings WHERE trip_id=? AND passenger_id=? AND status='reserved'",tripId,user.id));}
function rawTrip(row){if(!row)return null;const driver=row.driver||row.driver_name||'Driver';return {id:row.id,driver,initials:driver.split(/\s+/).slice(0,2).map(v=>v[0]).join('').toUpperCase(),from:row.from_city,to:row.to_city,date:row.date,depart:row.depart,arrive:row.arrive,price:row.price,seats:row.seats_left,totalSeats:row.seats_total,vehicle:row.vehicle,pickup:row.pickup,dropoff:row.dropoff,status:row.status,verified:true,ac:false,luggage:false,rating:'—',reviews:0,driverId:row.driver_id};}
const TRIP_QUERY='SELECT t.*,u.name AS driver FROM trips t JOIN users u ON u.id=t.driver_id';
const limits=new Map();
function throttle(req,type,max,windowMs){const ip=String(req.headers['x-forwarded-for']&&process.env.TRUST_PROXY==='1'?req.headers['x-forwarded-for'].split(',')[0]:req.socket.remoteAddress||'unknown');const key=type+':'+ip;const now=Date.now();let item=limits.get(key);if(!item||now-item.start>windowMs){item={start:now,count:0};limits.set(key,item)}must(++item.count<=max,'Too many attempts. Please try again later.',429);if(limits.size>5000){for(const [k,v] of limits){if(now-v.start>windowMs)limits.delete(k)}}}
async function bodyJSON(req){let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>16000)throw new ApiError(413,'Request body is too large');chunks.push(chunk)}try{let data=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');must(data&&typeof data==='object'&&!Array.isArray(data),'Expected an object');return data}catch(err){if(err instanceof ApiError)throw err;throw new ApiError(400,'Invalid JSON body')}}
function requireSameOrigin(req){
 // Prevent cross-site form and scripted writes; the custom header forces a CORS preflight for other origins.
 must(req.headers['x-travelconnect-client']==='web','Missing API request header',403);
 const origin=req.headers.origin;
 if(origin){const expected=`${secure(req)?'https':'http'}://${req.headers.host}`;must(origin===expected,'Cross-site requests are not allowed',403)}
 if(req.method!=='DELETE')must(String(req.headers['content-type']||'').split(';')[0].trim()==='application/json','Send JSON requests',415);
}
function ensureTripInput(v){const cities=['Johannesburg','Durban','Pretoria','Polokwane','Cape Town','Stellenbosch','Bloemfontein','Mbombela','Pietermaritzburg','Gqeberha'];const from=safeString(v.from,80),to=safeString(v.to,80);must(cities.includes(from)&&cities.includes(to)&&from!==to,'Choose two different supported cities');const date=validateDate(v.date),depart=validateTime(v.depart);const now=nowJohannesburg();must(date>now.date||(date===now.date&&depart>now.time),'Departure time must be in the future');const price=integer(v.price,1,50000,'Price per seat'),seats=integer(v.seats,1,8,'Available seats');const vehicle=safeString(v.vehicle,80);must(vehicle.length>=3,'Provide your vehicle description');const pickup=safeString(v.pickup,120)||'Pickup details in trip chat',dropoff=safeString(v.dropoff,120)||'Drop-off details in trip chat';return {from,to,date,depart,price,seats,vehicle,pickup,dropoff};}
function checkTripPublishStatus(user){role(user,['driver']);must(user.driver_status==='approved','Driver account needs manual administrator approval before publishing trips',403)}
export async function api(req,res,url){const method=req.method||'GET',pathname=url.pathname;
 if(!pathname.startsWith('/api/v1/'))return false;
 try{
  if(method==='GET'&&pathname==='/api/v1/health')return send(res,200,{ok:true,service:'TravelConnect',database:'connected',version:'0.3.0'});
  if(method==='GET'&&pathname==='/api/v1/weather'){
   throttle(req,'weather',90,60*60*1000);
   const city=safeString(url.searchParams.get('city'),80);
   const date=safeString(url.searchParams.get('date'),16);
   try{return send(res,200,{data:await weatherService.get(city,date||undefined)});}catch(error){throw new ApiError(error.status||503,error.status&&error.status<500?error.message:'Weather is temporarily unavailable. Please try again later.');}
  }
  if(method==='GET'&&pathname==='/api/v1/trips'){
   const now=nowJohannesburg();const where=["t.status='published'","t.seats_left>0","u.driver_status='approved'","(t.date > ? OR (t.date = ? AND t.depart > ?))"];const params=[now.date,now.date,now.time];
   for(const [param,col] of [['from','t.from_city'],['to','t.to_city'],['date','t.date']]){const val=safeString(url.searchParams.get(param),80);if(val){where.push(`${col}=?`);params.push(val)}}
   const minSeats=url.searchParams.get('seats');if(minSeats){where.push('t.seats_left>=?');params.push(integer(minSeats,1,8,'Seats'))}
   const rows=all(`${TRIP_QUERY} WHERE ${where.join(' AND ')} ORDER BY t.date,t.depart LIMIT 100`,...params).map(rawTrip);
   return send(res,200,{data:rows,total:rows.length});
  }
  const tripDetail=pathname.match(/^\/api\/v1\/trips\/([0-9a-f-]{36})$/);
  if(method==='GET'&&tripDetail){const row=one(`${TRIP_QUERY} WHERE t.id=? AND t.status='published' AND u.driver_status='approved'`,tripDetail[1]);must(row,'Journey not found',404);return send(res,200,{data:rawTrip(row)})}
  const user=userFor(req);
  if(method==='GET'&&pathname==='/api/v1/auth/me')return send(res,200,{user:redact(user)});
  if(method==='GET'&&pathname==='/api/v1/ai/status')return send(res,200,{enabled:aiService.enabled,provider:aiService.enabled?'OpenAI':null});
  if(['POST','PATCH','PUT','DELETE'].includes(method))requireSameOrigin(req);
  const data=['POST','PATCH','PUT'].includes(method)?await bodyJSON(req):{};
  if(method==='POST'&&pathname==='/api/v1/ai/ask'){
   auth(user);throttle(req,'ai',12,10*60*1000);
   try{return send(res,200,{data:await aiService.ask(data.question)});}catch(error){throw new ApiError(error.status||503,error.message);}
  }
  if(method==='POST'&&pathname==='/api/v1/auth/register'){
   throttle(req,'register',7,60*60*1000);
   const email=normalizeEmail(data.email), name=validName(data.name),pwd=validPassword(data.password);
   must(!one('SELECT 1 FROM users WHERE email=?',email),'This email address is already registered',409);
   const pass=passwordRecord(pwd),id=randomUUID();
   db.prepare("INSERT INTO users(id,name,email,password_salt,password_hash,created_at) VALUES(?,?,?,?,?,?)").run(id,name,email,pass.salt,pass.hash,iso());audit(id,'account.register');
   const token=randomToken();const until=new Date(Date.now()+SESSION_DAYS*86400000).toISOString();
   db.prepare('INSERT INTO sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)').run(hashToken(token),id,iso(),until);
   return send(res,201,{user:redact(one(`SELECT ${USER_FIELDS} FROM users WHERE id=?`,id))},{'Set-Cookie':cookie(token,req)});
  }
  if(method==='POST'&&pathname==='/api/v1/auth/login'){
   throttle(req,'login',15,15*60*1000);
   const email=normalizeEmail(data.email);must(typeof data.password==='string','Password is required');const account=one('SELECT * FROM users WHERE email=?',email);
   if(!account||!passwordValid(data.password,account.password_salt,account.password_hash))throw new ApiError(401,'Incorrect email or password');
   const token=randomToken();db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(iso());db.prepare('INSERT INTO sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)').run(hashToken(token),account.id,iso(),new Date(Date.now()+SESSION_DAYS*86400000).toISOString());audit(account.id,'account.login');
   return send(res,200,{user:redact(account)},{'Set-Cookie':cookie(token,req)});
  }
  if(method==='POST'&&pathname==='/api/v1/auth/logout'){
   const token=parseCookies(req.headers.cookie||'').tc_session;if(token)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hashToken(token));
   return send(res,200,{ok:true},{'Set-Cookie':cookie('',req,0)});
  }
  if(method==='PATCH'&&pathname==='/api/v1/auth/me'){
   auth(user);const name=validName(data.name);const phone=safeString(data.phone,30);db.prepare('UPDATE users SET name=?,phone=? WHERE id=?').run(name,phone,user.id);audit(user.id,'account.update');return send(res,200,{user:redact(one(`SELECT ${USER_FIELDS} FROM users WHERE id=?`,user.id))});
  }
  if(method==='POST'&&pathname==='/api/v1/driver/apply'){
   auth(user);must(user.role==='passenger'||user.role==='driver','Admin accounts cannot apply as drivers',403);must(user.driver_status!=='approved','Your driver account is already approved',409);
   const vehicle=safeString(data.vehicle,80);must(vehicle.length>=3,'Enter a vehicle description');
   db.prepare("UPDATE users SET role='driver',driver_status='pending',vehicle=? WHERE id=?").run(vehicle,user.id);audit(user.id,'driver.apply');
   return send(res,200,{user:redact(one(`SELECT ${USER_FIELDS} FROM users WHERE id=?`,user.id)),notice:'Application saved for manual administrator review. This does not certify documents or licences.'});
  }
  if(method==='GET'&&pathname==='/api/v1/driver/trips'){
   role(user,['driver','admin']);return send(res,200,{data:all(`${TRIP_QUERY} WHERE t.driver_id=? ORDER BY t.date DESC,t.depart DESC LIMIT 100`,user.id).map(rawTrip)});
  }
  if(method==='POST'&&pathname==='/api/v1/driver/trips'){
   checkTripPublishStatus(user);const v=ensureTripInput(data),id=randomUUID();
   db.prepare('INSERT INTO trips(id,driver_id,from_city,to_city,date,depart,price,seats_total,seats_left,vehicle,pickup,dropoff,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,user.id,v.from,v.to,v.date,v.depart,v.price,v.seats,v.seats,v.vehicle,v.pickup,v.dropoff,iso());audit(user.id,'trip.publish',id);
   return send(res,201,{data:rawTrip(one(`${TRIP_QUERY} WHERE t.id=?`,id))});
  }
  const removeTrip=pathname.match(/^\/api\/v1\/driver\/trips\/([0-9a-f-]{36})$/);
  if(method==='DELETE'&&removeTrip){checkTripPublishStatus(user);const id=removeTrip[1];must(one('SELECT 1 FROM trips WHERE id=? AND driver_id=? AND status=?',id,user.id,'published'),'Journey not found',404);
   must(!one("SELECT 1 FROM bookings WHERE trip_id=? AND status='reserved'",id),'Cannot cancel a journey with active reservations. Contact support first.',409);
   db.prepare("UPDATE trips SET status='cancelled' WHERE id=?").run(id);audit(user.id,'trip.cancel',id);return send(res,200,{ok:true});
  }
  if(method==='POST'&&pathname==='/api/v1/bookings'){
   auth(user);const seats=integer(data.seats,1,8,'Seats'),tripId=data.tripId,requestId=data.requestId;
   must(uuid(tripId),'Select a valid journey');must(typeof requestId==='string'&&/^[a-zA-Z0-9-]{8,100}$/.test(requestId),'A unique booking request reference is required');
   const result=transaction(()=>{
    const existing=one('SELECT * FROM bookings WHERE passenger_id=? AND request_id=?',user.id,requestId);if(existing){must(existing.trip_id===tripId&&existing.seats===seats,'This request ID was already used for another reservation',409);return existing;}
    const trip=one('SELECT * FROM trips WHERE id=?',tripId);
    must(trip&&trip.status==='published','This journey is not available',404);
    const approved=one('SELECT driver_status FROM users WHERE id=?',trip.driver_id);must(approved?.driver_status==='approved','Driver is not approved',403);
    must(trip.driver_id!==user.id,'You cannot reserve a seat on your own journey');
    const now=nowJohannesburg();must(trip.date>now.date||(trip.date===now.date&&trip.depart>now.time),'This journey has already departed',409);
    const changed=db.prepare("UPDATE trips SET seats_left=seats_left-? WHERE id=? AND seats_left>=? AND status='published'").run(seats,tripId,seats);
    must(changed.changes===1,'Not enough seats remain. Please refresh results.',409);
    const id=randomUUID();db.prepare('INSERT INTO bookings(id,passenger_id,trip_id,seats,total,request_id,created_at) VALUES(?,?,?,?,?,?,?)').run(id,user.id,tripId,seats,seats*trip.price,requestId,iso());
    audit(user.id,'booking.create',id);return one('SELECT * FROM bookings WHERE id=?',id);
   });
   return send(res,201,{data:{...result,disclaimer:'Reservation is recorded in the database. No money has been collected.'}});
  }
  if(method==='GET'&&pathname==='/api/v1/driver/bookings'){
   role(user,['driver']);const rows=all(`SELECT b.id,b.trip_id AS tripId,b.seats,b.status,b.created_at AS createdAt,p.name AS passenger,t.from_city AS origin,t.to_city AS destination,t.date FROM bookings b JOIN trips t ON t.id=b.trip_id JOIN users p ON p.id=b.passenger_id WHERE t.driver_id=? ORDER BY b.created_at DESC LIMIT 100`,user.id);return send(res,200,{data:rows});
  }
  if(method==='GET'&&pathname==='/api/v1/bookings'){
   auth(user);const rows=all(`SELECT b.*,t.from_city AS origin,t.to_city AS destination,t.date,t.depart,t.arrive,t.vehicle,t.driver_id,t.pickup,t.dropoff,u.name AS driver FROM bookings b JOIN trips t ON t.id=b.trip_id JOIN users u ON u.id=t.driver_id WHERE b.passenger_id=? ORDER BY b.created_at DESC`,user.id);
   return send(res,200,{data:rows.map(b=>({id:b.id,tripId:b.trip_id,from:b.origin,to:b.destination,date:b.date,depart:b.depart,arrive:b.arrive,seats:b.seats,total:b.total,status:b.status,driver:b.driver,vehicle:b.vehicle,createdAt:b.created_at}))});
  }
  const cancel=pathname.match(/^\/api\/v1\/bookings\/([0-9a-f-]{36})\/cancel$/);
  if(method==='POST'&&cancel){auth(user);const result=transaction(()=>{const b=one('SELECT * FROM bookings WHERE id=? AND passenger_id=?',cancel[1],user.id);must(b,'Booking not found',404);if(b.status==='cancelled')return {bookingStatus:'cancelled'};
   const dep=one('SELECT date,depart FROM trips WHERE id=?',b.trip_id);const now=nowJohannesburg();must(dep&&(dep.date>now.date||(dep.date===now.date&&dep.depart>now.time)),'Past bookings cannot be cancelled online',409);
   db.prepare("UPDATE bookings SET status='cancelled',cancelled_at=? WHERE id=? AND status='reserved'").run(iso(),b.id);db.prepare('UPDATE trips SET seats_left=seats_left+? WHERE id=?').run(b.seats,b.trip_id);audit(user.id,'booking.cancel',b.id);return {bookingStatus:'cancelled'};});return send(res,200,result);
  }
  const message=pathname.match(/^\/api\/v1\/trips\/([0-9a-f-]{36})\/messages$/);
  if(message){const id=message[1];must(canMessage(user,id),'Only travellers and drivers on this trip can read messages',403);
   if(method==='GET'){const rows=all('SELECT m.id,m.content,m.created_at,m.author_id,u.name AS author FROM messages m JOIN users u ON u.id=m.author_id WHERE trip_id=? ORDER BY m.created_at ASC LIMIT 200',id);return send(res,200,{data:rows.map(m=>({...m,mine:m.author_id===user.id}))});}
   if(method==='POST'){throttle(req,'messages',120,60000);const content=safeString(data.message,1000);must(content.length>=1&&content.length<=1000,'Message must be 1 to 1000 characters');const row={id:randomUUID(),tripId:id,authorId:user.id,content,createdAt:iso()};db.prepare('INSERT INTO messages(id,trip_id,author_id,content,created_at) VALUES(?,?,?,?,?)').run(row.id,row.tripId,row.authorId,row.content,row.createdAt);return send(res,201,{data:row});}
  }
  if(method==='GET'&&pathname==='/api/v1/admin/stats'){
   role(user,['admin']);return send(res,200,{data:{users:one('SELECT count(*) AS n FROM users').n,driversPending:one("SELECT count(*) AS n FROM users WHERE driver_status='pending'").n,tripsPublished:one("SELECT count(*) AS n FROM trips WHERE status='published'").n,bookingsReserved:one("SELECT count(*) AS n FROM bookings WHERE status='reserved'").n}});
  }
  if(method==='GET'&&pathname==='/api/v1/admin/overview'){
   role(user,['admin']);
   const stats={
    users:one('SELECT count(*) AS n FROM users').n,
    driversPending:one("SELECT count(*) AS n FROM users WHERE driver_status='pending'").n,
    driversApproved:one("SELECT count(*) AS n FROM users WHERE driver_status='approved'").n,
    tripsPublished:one("SELECT count(*) AS n FROM trips WHERE status='published'").n,
    bookingsReserved:one("SELECT count(*) AS n FROM bookings WHERE status='reserved'").n,
    seatsReserved:one("SELECT coalesce(sum(seats),0) AS n FROM bookings WHERE status='reserved'").n,
    faresReserved:one("SELECT coalesce(sum(total),0) AS n FROM bookings WHERE status='reserved'").n
   };
   const recentBookings=all("SELECT b.id,b.created_at,b.status,b.seats,b.total,u.name AS passenger,t.from_city,t.to_city,t.date FROM bookings b JOIN users u ON u.id=b.passenger_id JOIN trips t ON t.id=b.trip_id ORDER BY b.created_at DESC LIMIT 8");
   const recentTrips=all("SELECT t.id,t.from_city,t.to_city,t.date,t.depart,t.seats_left,t.seats_total,t.status,u.name AS driver FROM trips t JOIN users u ON u.id=t.driver_id ORDER BY t.created_at DESC LIMIT 8");
   const recentActivity=all('SELECT action,created_at FROM audit_events ORDER BY created_at DESC LIMIT 12');
   return send(res,200,{data:{stats,recentBookings,recentTrips,recentActivity}});
  }
  if(method==='GET'&&pathname==='/api/v1/admin/drivers'){
   role(user,['admin']);const status=url.searchParams.get('status')||'pending';must(['pending','approved','rejected'].includes(status),'Invalid driver status');return send(res,200,{data:all(`SELECT ${USER_FIELDS} FROM users WHERE driver_status=? ORDER BY created_at DESC LIMIT 100`,status)});
  }
  const review=pathname.match(/^\/api\/v1\/admin\/drivers\/([0-9a-f-]{36})\/(approve|reject)$/);
  if(method==='POST'&&review){role(user,['admin']);const driverId=review[1],action=review[2];must(one("SELECT 1 FROM users WHERE id=? AND role='driver' AND driver_status='pending'",driverId),'Pending driver application not found',404);
   // Human administrator must verify legal documentation out of band before approving.
   db.prepare('UPDATE users SET driver_status=? WHERE id=?').run(action==='approve'?'approved':'rejected',driverId);audit(user.id,'driver.'+action,driverId);return send(res,200,{ok:true,disclaimer:'Admin status indicates manual internal review, not external identity or licence certification.'});
  }
  throw new ApiError(404,'API endpoint not found');
 }catch(err){const status=err instanceof ApiError?err.status:500; if(status>=500)console.error('[API]',err);send(res,status,{error:status>=500?'Unexpected server error':err.message});}
 return true;
}
