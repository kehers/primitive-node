## primitive-node

An image server port of [primitive.js](https://github.com/ondras/primitive.js)/[primitive](https://github.com/fogleman/primitive/). (Will write doc and create demo).

## How it works

The server receives input from query parameters, generates the primitive image and store it in S3 using redis to cache generated urls. There is a `.env.example` file that contains the needed variables. Open the file, edit the variables and rename the file to `.env`. If you are not interested in caching the images (moving to S3 and string url in redis), those settings can be ignored.

## Usage

- `image`: urlencoded URL of the image
- `compute_size`: Computation size (128 - 512). Default is `128`.
- `size`: Size of generated image (px). Default: `400`,
- `steps`: req.query.steps || 100,
- `shapes_no`: Number of shapes. Defaults to `100`
- `alpha`: Starting opacity. Default: `0.5`
- `shape`: Shape to use. Default: `triangle`. Options: `rectangle`, `ellipse`, `smiley`. You can also use send an array of more than one shape.

## Limitations

