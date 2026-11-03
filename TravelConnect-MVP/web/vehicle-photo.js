/**
 * TravelConnect car photo: browser-only compression before the authenticated upload.
 * Server re-validates MIME, size and file signatures. Nothing is uploaded by this module.
 */
export async function compressVehiclePhoto(file){
 if(!file)throw Error('Select a photo of the actual car.');
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Use a JPG, PNG or WebP vehicle photo.');
 if(file.size>8*1024*1024)throw Error('Choose a photo smaller than 8 MB.');
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Photo could not be opened'));image.src=url;});
  if(!image.naturalWidth||!image.naturalHeight)throw Error('Choose a readable photo.');
  const scale=Math.min(1,980/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
  canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Your browser cannot resize the photo.');
  ctx.drawImage(image,0,0,canvas.width,canvas.height);
  const data=canvas.toDataURL('image/jpeg',.76);
  if(data.length>1150000)throw Error('The photo is still too large. Choose a smaller image.');
  return data;
 }finally{URL.revokeObjectURL(url)}
}
