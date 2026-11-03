import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {webcrypto} from 'node:crypto';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=readFileSync(path.join(root,'web/app.js'),'utf8');
const main={innerHTML:'',querySelector:()=>null};
const toast={textContent:'',classList:{add(){},remove(){}}};
const el={textContent:''};
const elements={'#app':main,'#toast':toast,'#header-initials':el,'#year':{textContent:''}};
const sandbox={
 document:{querySelector:s=>elements[s]||null,querySelectorAll:()=>[],addEventListener(){}},
 window:{addEventListener(){},scrollTo(){},TRAVELCONNECT_API_BASE:''},
 localStorage:{getItem:()=>null,setItem(){}},
 navigator:{}, location:{hash:'#home',protocol:'http:'},
 fetch:async(url)=>({ok:true,json:async()=>url.endsWith('/auth/me')?{user:null}:{data:[]}}),
 crypto:webcrypto,FormData:class{},Date,Number,String,Array,Object,Math,Map,Set,Error,JSON,Promise,
 setTimeout,clearTimeout,console,structuredClone,confirm:()=>true
};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'web/app.js'});
function show(route,prelude=''){
 if(prelude)vm.runInContext(prelude,sandbox);
 sandbox.location.hash='#'+route;
 vm.runInContext('render()',sandbox);
 return main.innerHTML;
}
test('TravelConnect frontend renders live authenticated and guest routes without runtime errors',()=>{
 assert.match(show('home'),/Search journeys/);
 assert.match(show('search'),/No journeys available yet/);
 assert.match(show('profile'),/auth-form/);
 assert.match(show('auth'),/Sign in/);
 assert.match(show('driver'),/Sign in to drive/);
 assert.match(show('admin'),/Administrator access only/);
 assert.match(show('assistant'),/TripAI/);
 assert.match(show('weather'),/Get real forecast/);
 const user={id:'u',role:'passenger',name:'Passenger',email:'test@example.com',phone:'',driver_status:'none'};
 assert.match(show('profile',`currentUser=${JSON.stringify(user)};`),/Account settings/);
 assert.match(show('driver'),/Driver application/);
 assert.match(show('trips'),/No journeys yet/);
 const d={...user,role:'driver',driver_status:'approved',vehicle:'Toyota Corolla'};
 assert.match(show('driver',`currentUser=${JSON.stringify(d)};`),/Publish a journey/);
 assert.match(show('admin',`currentUser={...currentUser,role:'admin'};adminOverview={stats:{users:5,bookingsReserved:2,seatsReserved:4,faresReserved:1520,tripsPublished:1,driversApproved:1,driversPending:1},recentBookings:[{passenger:'Test Rider',from_city:'Johannesburg',to_city:'Durban',date:'2026-11-04',seats:1,total:380,status:'reserved'}],recentTrips:[],recentActivity:[]};`),/Test Rider/);
});
