/** Open-Meteo forecasts, proxied server-side; never location tracking. */
const CITY_COORDS = Object.freeze({
  Johannesburg:[-26.2041,28.0473],Durban:[-29.8587,31.0218],Pretoria:[-25.7479,28.2293],
  Polokwane:[-23.9045,29.4689], 'Cape Town':[-33.9249,18.4241],Stellenbosch:[-33.9321,18.8602],
  Bloemfontein:[-29.0852,26.1596],Mbombela:[-25.4745,30.9703],Pietermaritzburg:[-29.6094,30.3927],
  Gqeberha:[-33.9608,25.6022]
});
export const weatherCities=Object.keys(CITY_COORDS);
const describe = code => code===0?'Clear sky':code<=3?'Partly cloudy':code<=48?'Foggy':code<=67?'Rain showers':code<=77?'Snow':code<=82?'Showers':code<=86?'Snow showers':code<=99?'Thunderstorms':'Conditions unavailable';
export function createWeatherService({fetchImpl=fetch, now=()=>Date.now(),apiKey=process.env.TC_OPEN_METEO_KEY||'',production=process.env.NODE_ENV==='production'}={}){
 const cache=new Map();const pending=new Map();const ttlMs=15*60*1000;
 const allowed = !production || Boolean(apiKey);
 async function get(city,requestedDate){
  if(!Object.hasOwn(CITY_COORDS,city))throw Object.assign(new Error('Unsupported city'),{status:400});
  if(requestedDate && !/^\d{4}-\d{2}-\d{2}$/.test(requestedDate))throw Object.assign(new Error('Invalid date'),{status:400});
  if(!allowed)throw Object.assign(new Error('Weather needs a commercial Open-Meteo API key on production hosting'),{status:503});
  const key=city;const cached=cache.get(key);let raw;
  if(cached&&cached.expires>now())raw=cached.data;
  else if(pending.has(key))raw=await pending.get(key);
  else {
    const [latitude,longitude]=CITY_COORDS[city];
    const root=apiKey?'https://customer-api.open-meteo.com/v1/forecast':'https://api.open-meteo.com/v1/forecast';
    const endpoint=new URL(root);endpoint.searchParams.set('latitude',String(latitude));endpoint.searchParams.set('longitude',String(longitude));
    endpoint.searchParams.set('timezone','Africa/Johannesburg');endpoint.searchParams.set('forecast_days','16');
    endpoint.searchParams.set('current','temperature_2m,wind_speed_10m,weather_code');
    endpoint.searchParams.set('daily','temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code');
    if(apiKey)endpoint.searchParams.set('apikey',apiKey);
    const request=(async()=>{
      let response;
      try{response=await fetchImpl(endpoint,{signal:AbortSignal.timeout(5500),headers:{Accept:'application/json'}})}
      catch{throw Object.assign(new Error('Weather provider is temporarily unavailable'),{status:503})}
      if(!response.ok)throw Object.assign(new Error('Weather provider returned an error'),{status:503});
      const data=await response.json();
      if(!Array.isArray(data?.daily?.time)||!data.current)throw Object.assign(new Error('Weather provider returned incomplete data'),{status:503});
      cache.set(key,{data,expires:now()+ttlMs});return data;
    })();pending.set(key,request);try{raw=await request}finally{pending.delete(key)}
  }
  const days=raw.daily;const index=requestedDate?days.time.indexOf(requestedDate):0;
  if(index<0)throw Object.assign(new Error('Forecast is not available for that date (up to 16 days ahead)'),{status:422});
  const getDaily=(field)=>Number.isFinite(days[field]?.[index])?days[field][index]:null;
  const output={city,date:days.time[index],current:{temperature:Number.isFinite(raw.current.temperature_2m)?raw.current.temperature_2m:null,
    windKmh:Number.isFinite(raw.current.wind_speed_10m)?raw.current.wind_speed_10m:null,
    conditions:describe(raw.current.weather_code)},
   forecast:{high:getDaily('temperature_2m_max'),low:getDaily('temperature_2m_min'),rainChance:getDaily('precipitation_probability_max'),conditions:describe(days.weather_code?.[index])},
   updatedAt:raw.current.time||new Date(now()).toISOString(),provider:'Open-Meteo',providerUrl:'https://open-meteo.com/',forecastNotTracking:true};
  return output;
 }
 return {get};
}
export const weatherService=createWeatherService();
