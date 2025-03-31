import { NextResponse } from 'next/server';

// A sample GLB model URL that should be publicly accessible
const TEST_MODEL_URLS = [
  // Khronos sample models
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb",
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Fox/glTF-Binary/Fox.glb",
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BrainStem/glTF-Binary/BrainStem.glb",
  // Meshy URLs
  "https://assets.meshy.ai/dde223bd-6cb0-4ab7-8971-b7a01460f124/tasks/0195e61d-bbb3-7cff-8cae-74b6772e40c0/output/model.glb?Expires=1743581827&Signature=eNGxxnxhXPJbECK7YNTVh0Ll2DjrfKUCe5QMmOl2XWb2jaAz8Ezg4p1R~LWo2BRlv~ONgu8jph4UiCyTDfUGYEcJfdW2AsdaBwM3skr-UXuup8N7blMYprc0uD7nlca95JnuheHNDBvz4vRnKrgQUtTOwktxNOeWfj8ZE0qhaOpzhxDt80lFNC9d3VwGCHFZBKIe~l4xdBWGZcTNVEGlfEsiCcJByw4ahPLEhp0HAitg4T7dm7pVuCSizQx~89uQ4pY2NxHhXqlPqxn1q4I39~L9WUJdyhHfOexnPiBA0-WCdxAsC6WIESrziVzLmk7kaOOUXnTP3i3CD-4~ZKgWhg__&Key-Pair-Id=KL5I0C8H7HX83",
  "https://assets.meshy.ai/dde223bd-6cb0-4ab7-8971-b7a01460f124/tasks/0195e612-506f-777f-b50c-7fb56ac2ecb7/output/model.glb?Expires=1743581105&Signature=LXRHKRtdLkv~cfl1JVcFZzCLJ17B8rF8xlpJYvY~tcb3S~d8mqeGx7WaO5SrD5TxMIs8RMdVMnBi3QV4Ac2~5Z385WuABltkqUHdyAgY59glHj6BZtnAbNTS2QOAN52Xf8A1RWpH01iM8lyfw~jleudv4hKhbbUwz~uT~ITlLnGxJ8URW~XKUUSGS3NSUomor33fd5h9L5crhZPxLZE~3hWUb8YM8pe1vxtGNXwYIUKRzsxgytY0eCbXq2naCvuPpkPSXiPBJll0wetMdvGZAa1MSj5qy52Mm73dQEbpzJZzTULZCcSFrqIaDu~l8OMnFdk7nviznR4Z-vcju42I9g__&Key-Pair-Id=KL5I0C8H7HX83"
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const index = Number(url.searchParams.get('index') || '0');
  
  // Select the model URL
  const selectedModelUrl = TEST_MODEL_URLS[index] || TEST_MODEL_URLS[0];
  
  // Create the URLs for direct and proxied access
  const directUrl = selectedModelUrl;
  const proxiedUrl = `/api/proxy?url=${encodeURIComponent(selectedModelUrl)}`;
  const debugUrl = `/api/proxy-debug?url=${encodeURIComponent(selectedModelUrl)}`;
  
  return NextResponse.json({
    modelUrls: {
      direct: directUrl,
      proxied: proxiedUrl,
      debug: debugUrl
    },
    availableModels: TEST_MODEL_URLS.map((url, i) => ({
      id: i,
      name: url.split('/').pop()?.split('?')[0] || `Model ${i}`,
      url
    }))
  });
} 