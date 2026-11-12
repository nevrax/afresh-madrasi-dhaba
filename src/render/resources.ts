interface EmbeddedResources { json:Record<string,unknown>; binary:Record<string,string> }
const embedded=():EmbeddedResources|undefined=>(globalThis as typeof globalThis&{__madrasiResources?:EmbeddedResources}).__madrasiResources;
const key=(url:string):string=>url.replace(/^\.\//,'');

/** HTTP and file builds share the same game; only resource transport differs. */
export async function resourceJson<T>(url:string):Promise<T>{
  const resources=embedded();
  if(resources){
    if(!Object.hasOwn(resources.json,key(url)))throw new Error(`Missing embedded resource: ${url}`);
    return resources.json[key(url)] as T;
  }
  const response=await fetch(url);if(!response.ok)throw new Error(`Could not load resource: ${url}`);
  return response.json() as Promise<T>;
}
export function resourceUrl(url:string):string{return embedded()?.binary[key(url)]??url;}
