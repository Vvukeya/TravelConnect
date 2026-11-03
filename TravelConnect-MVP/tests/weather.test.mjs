import test from 'node:test';
import assert from 'node:assert/strict';
import {createWeatherService,weatherCities} from '../server/weather.mjs';

const weatherPayload={
 current:{time:'2026-11-03T12:00',temperature_2m:24.3,wind_speed_10m:14.2,weather_code:3},
 daily:{time:['2026-11-03','2026-11-04'],temperature_2m_max:[26.5,28.1],temperature_2m_min:[13.2,16.6],precipitation_probability_max:[12,70],weather_code:[1,61]}
};
test('weather provider integration validates, caches and formats real provider responses',async()=>{
 let hits=0;
 const srv=createWeatherService({fetchImpl:async url=>{hits++;assert.match(url.toString(),/api\.open-meteo\.com/);return {ok:true,json:async()=>weatherPayload}},production:false,now:()=>Date.UTC(2026,10,3)});
 assert.equal(weatherCities.length,10);
 const [a,b]=await Promise.all([srv.get('Durban','2026-11-04'),srv.get('Durban','2026-11-04')]);
 assert.equal(hits,1);assert.equal(a.forecast.high,28.1);assert.equal(b.forecast.rainChance,70);
 assert.equal((await srv.get('Durban','2026-11-03')).current.temperature,24.3);assert.equal(hits,1);
 await assert.rejects(()=>srv.get('NotReal','2026-11-03'),{status:400});
 await assert.rejects(()=>srv.get('Durban','2026-11-99'),{status:422});
 await assert.rejects(()=>srv.get('Durban','2026-12-01'),{status:422});
});
test('commercial production requires an explicit paid provider credential',async()=>{
 const s=createWeatherService({production:true,apiKey:''});
 await assert.rejects(()=>s.get('Johannesburg'),{status:503});
 let endpoint='';const paid=createWeatherService({production:true,apiKey:'private-key',fetchImpl:async url=>{endpoint=url.toString();return {ok:true,json:async()=>weatherPayload}}});
 assert.equal((await paid.get('Johannesburg','2026-11-04')).provider,'Open-Meteo');
 assert.match(endpoint,/customer-api.open-meteo.com/);assert.match(endpoint,/apikey=private-key/);
});
test('provider failures do not return fake forecasts',async()=>{
 const failed=createWeatherService({production:false,fetchImpl:async()=>{throw Error('network unreachable')}});
 await assert.rejects(()=>failed.get('Cape Town','2026-11-03'),{status:503});
});
