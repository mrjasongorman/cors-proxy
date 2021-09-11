blacklist = [ ]; // blacklisted origins
whitelist = [ "http://localhost:8080", "https://myfeedrss.netlify.app", "https://myfeed.jasongorman.uk" ]; // whitelisted origins

const isListed = (uri, listing) => {
    let result = false;
    if (typeof uri == "string") {
        listing.forEach(item => {
	        if (uri === item) result = true;
        });
    } else {
    	result = false; // true accepts null origins false rejects them.
    }
    return result;
}

addEventListener("fetch", async event => {
    event.respondWith((async function() {
            const proxy_url = new URL(event.request.url);
            const fetchOrigin = event.request.headers.get("Origin");

            // Check header origin
            if ((!isListed(fetchOrigin, blacklist)) && (isListed(fetchOrigin, whitelist))) {
                
                // Get URL to consume
                const fetch_url = decodeURIComponent(proxy_url.searchParams.get('s'));
                
                if(fetch_url === '') {
                    return new Response(
                        "Not Found",
                        {
                            status: 404,
                            statusText: 'Not Found',
                            headers: {
                                "Content-Type": "text/plain"
                            }
                        }
                    );
                }

                // Fetch and add CORS header
                const fetchPromise = fetch(fetch_url, {
                    'User-Agent': 'Mozilla/5.0 myfeed.jasongorman.uk MyFeedRSS/1.0'
                });
                const timeoutPromise = new Promise(resolve => setTimeout(resolve, 1300));

                // Race against the timeout
                const response = await Promise.race([fetchPromise, timeoutPromise]);

                if(response){
                    let myHeaders = new Headers(response.headers);
                    myHeaders.set("Access-Control-Allow-Origin", fetchOrigin);
			
		    // clean response type so Cloudflare can send back compressed
                    if( 
                        response.headers.get('content-type').includes('application/rss+xml') || 
                        response.headers.get('content-type').includes('application/atom+xml') || 
                        response.headers.get('content-type').includes('charset')
                    ){
                        myHeaders.set('content-type', 'application/xml+rss');
                    }

                    if(!response.headers.has('server')) {
                        myHeaders.set('server', 'unknown');
                    }

                    const body = await response.arrayBuffer();

                    const newHeaders = {
                        headers: myHeaders,
                        status: response.status,
                        statusText: response.statusText
                    };

                    return new Response(body, newHeaders);
                } else {
                    return new Response(
                        "Gateway Timeout",
                        {
                            status: 504,
                            statusText: 'Gateway Timeout',
                            headers: {
                                "Content-Type": "text/plain"
                            }
                        }
                    );
                }
            } else {
                return new Response(
                    "Forbidden",
                    {
                        status: 403,
                        statusText: 'Forbidden',
                        headers: {
                            "Content-Type": "text/plain"
                        }
                    }
                );
            }
        })());
});
