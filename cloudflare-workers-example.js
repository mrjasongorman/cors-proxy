const allowedOrigins = [ 'http://localhost:3000', 'https://example.com' ];

const isListed = (uri, listing) => {
    let result = false;
    if (typeof uri == 'string') {
        listing.forEach(item => {
	        if (uri === item || uri.startsWith(item)) result = true;
        });
    } else {
    	result = true; // true accepts null origins false rejects them.
    }
    return result;
}

addEventListener('fetch', event => {
  event.respondWith( proxyHandler(event.request) );
});

async function proxyHandler(request) {
    const proxy_url = new URL(request.url);
    const fetchOrigin = request.headers.get('origin');

    const isInWhitelist = isListed(fetchOrigin, allowedOrigins);

    // Check header origin
    if (isInWhitelist) {
                
        // Get URL to consume
        const fetch_url = proxy_url.searchParams.has('s') ? decodeURIComponent(proxy_url.searchParams.get('s')) : '';
                
        if(fetch_url === '') {
            return new Response(
                'Not Found',
                {
                    status: 404,
                    statusText: 'Not Found',
                    headers: {
                        'Content-Type': 'text/plain'
                    }
                }
            );
        }


        // Create stream to send back data
        let { readable, writable } = new TransformStream();

        // Fetch and add CORS header
        const fetchPromise = fetch(fetch_url, {
            'User-Agent': 'Mozilla/5.0 myfeed.jasongorman.uk MyFeedRSS/1.0'
        });
        
        const timeoutPromise = new Promise(resolve => setTimeout(resolve, 1300));

        // Race against the timeout
        const response = await Promise.race([fetchPromise, timeoutPromise]);

        if(response){
            let myHeaders = new Headers(response.headers);

            if( fetchOrigin !== null ){
                myHeaders.set('Access-Control-Allow-Origin', fetchOrigin);
            } else {
                // null origin means a same origin request
                myHeaders.set('Access-Control-Allow-Origin', 'https://myfeed.jasongorman.uk');
            }
                    
            if( response.headers.has('content-type') &&
                response.headers.get('content-type').includes('xml')
            ){
                myHeaders.set('content-type', 'text/xml');
            }

            if( response.headers.has('cache-control') ){
                const currentCacheControl = response.headers.get('cache-control');
                const newCacheControl = currentCacheControl.includes('no-transform') ? currentCacheControl.replace('no-transform', '') : currentCacheControl;
                myHeaders.set('cache-control', newCacheControl);
            }

            // stream response body
            response.body.pipeTo(writable);

            const newHeaders = {
                headers: myHeaders,
                status: response.status,
                statusText: response.statusText
            };

            return new Response(readable, newHeaders);
        
        } else {
            return new Response(
                'Gateway Timeout',
                {
                    status: 504,
                    statusText: 'Gateway Timeout',
                    headers: {
                        'Content-Type': 'text/plain'
                    }
                }
            );
        }
    
    } else {
        return new Response(
            'Forbidden',
            {
                status: 403,
                statusText: 'Forbidden',
                headers: {
                    'Content-Type': 'text/plain'
                }
            }
        );
    }

}

