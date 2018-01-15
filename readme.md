# primitive-node
An image server port of [primitive.js](https://github.com/ondras/primitive.js)/[primitive](https://github.com/fogleman/primitive/). (Will write doc and create demo).

## How it works
The server receives input from URL query parameters, generates the primitive image and store it on S3, using redis to cache generated urls.

## Prerequisites and Modules
One of the core modules used by the app is [node-canvas](https://github.com/Automattic/node-canvas). `node-canvas` requires some OS dependencies so take a look at its installation before continuing.

If caching is enabled (default), you will also have to setup redis and create an S3 account. To disable caching, comment the `CACHE` line in the `.env` file.

## Limitations
This is CPU intensive and depending on source image size and other parameters, generating images could take time. Because of this, generating images on the fly is not the default option. Instead of outputting the image, the service sends back the URL of the generated image in the json format: `{"src": "[s3_url]"}` (if caching is enabled) or  `{"src": "data:image/jpeg;base64,[base64_encoded_data]"}` (if caching is not enabled). As obvious, caching prevents having to process already generated images all over again. So instead of using on the fly, you can prefetch your images and use the returned url in your `img` tag.

If you really want to generate the images on fly (bad idea), pass the GET parameter `browser=1`. This outputs the image directly to the browser. If caching is enabled, subsequent request of same parameters will not require processing the source image all over again.

In production, you may want to explore using queues and parallel running.

## Running
- Download (or clone) locally or to your server
- Run `npm install`
- Rename  `.env.example` file to `.env` and edit variables. If you are not interested in caching the images (moving to S3 and string url in redis), those settings can be ignored.
- Start with `node app.js` or in your favourite way

Once the service is running, you can pass the source image and  other parameters to it like this `http://localhost:port/?image=[absolute image url]&size=100`

## [GET] Parameters
- `image`: URL-encoded absolute URL of the source image
- `browser`: Set to anything to output image directly to browser instead of returning URL of generated image
- `compute_size`: Computation size (128 - 512). Default is `128`.
- `size`: Size of generated image (px). Default: `400`,
- `steps`: req.query.steps || 100,
- `alpha`: Starting opacity. Default: `0.5`
- `shape`: Shape to use. Default: `triangle`. Options: `rectangle`, `ellipse`, `smiley`. You can also use send an array of more than one shape.
- `shapes_no`: Number of shapes to use. Defaults to `100`

## License
MIT

