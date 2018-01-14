require('dotenv').config();
const crypto = require('crypto')
      , {promisify} = require('util')

      //, xmlserializer = require('xmlserializer')
      , express = require('express')
      , compression = require('compression')

      , {Canvas, Polygon, Triangle, Rectangle, Ellipse, Smiley, Optimizer} = require('./primitive')

      ;

let AWS, redis, redisGet, s3;

// If caching images, bring in caching modules
if (process.env.CACHE) {
  AWS = require('aws-sdk')
        , redis = require("redis")
        , redisClient = redis.createClient()
        , redisGet = promisify(redisClient.get).bind(redisClient)
  ;

  /*
  redisClient.on("error", err => {
    // Gracefully degrade?
    // Or throw?
  });
  //*/

  s3 = new AWS.S3({
    region: process.env.AWS_REGION
  });
}

const app = express();
app.listen(process.env.PORT);
app.use(compression());
app.get('/', (req, res) => {

  // There should be an image
  if (!req.query.image) {
    res.status(404);
    return res.end();
  }

  let shapes = [];
  let _arr = {
    'triangle': Triangle,
    'rectangle': Rectangle,
    'ellipse': Ellipse,
    'smiley': Smiley,
  }
  if (!req.query.shape)
    shapes.push(Triangle);
  else {
    if (Array.isArray(req.query.shape)) {
      for (let v of req.query.shape) {
        if (_arr[v.toLowerCase()])
          shapes.push(_arr[v.toLowerCase()]);
      }
    }
    else {
      if (_arr[req.query.shape.toLowerCase()])
        shapes.push(_arr[req.query.shape.toLowerCase()]);
    }
    if (shapes.length == 0)
      shapes.push(Triangle);
  }

  let image = decodeURIComponent(req.query.image);
  const key = crypto.createHash('md5').update(JSON.stringify(req.query)).digest('hex').substr(0, 7)
              + ':' + image.length;
  let p;

  if (process.env.CACHE) {
    p = new Promise((resolve, reject) => {
        redisGet(key)
        .then(src => {
          return resolve(src);
        })
        .catch(err => {
          // Even if there is an error, everything should still go well
          resolve();
        })
      });
  }
  else
    p = Promise.resolve();

  let cfg = {
    computeSize: req.query.compute_size || 128, // 128 - 512
    viewSize: req.query.size || 400,
    steps: req.query.steps || 100,
    shapes: req.query.shapes_no || 100,
    alpha: req.query.alpha || 0.5,
    mutations: 10,
    mutateAlpha: true,
    shapeTypes: shapes, // Rectangle, Ellipse, Smiley,
    fill: 'auto' // or colorcode
  };

  p.then(src => {
    // Image cached already
    // Redirect
    if (src)
      return req.query.browser ? res.redirect(src) : res.json({src: src});

    Canvas.original(image, cfg)
    .then(original => {
      let optimizer = new Optimizer(original, cfg);

      let cfg2 = Object.assign({}, cfg, {width:cfg.scale*cfg.width, height:cfg.scale*cfg.height});
      let result = Canvas.empty(cfg2, false);
      result.ctx.scale(cfg.scale, cfg.scale);

      let svg = Canvas.empty(cfg, true);
      svg.setAttribute("width", cfg2.width);
      svg.setAttribute("height", cfg2.height);

      optimizer.onStep = (step) => {
        if (step) {
          result.drawStep(step);
          svg.appendChild(step.toSVG());
        }
      };
      optimizer.onEnd = () => {
        result.node.toDataURL('image/jpeg', (err, url) => {
          // Not caching, send directly to browser
          let time = parseInt(process.env.EXPIRES);
          //
          if (req.query.browser) {
            // Caching,
            res.set({"Cache-Control": `public, max-age=${time}`});
            res.set({'Content-type': 'image/jpeg'});
            res.end(Buffer.from(url.replace('data:image/jpeg;base64,', ''), 'base64'), 'binary');
          }

          if (process.env.CACHE) {
            // Caching
            // Move to S3
            s3.upload({
              ACL: 'public-read',
              Bucket: process.env.S3_BUCKET,
              Key: `${key}.jpg`,
              CacheControl: `public, max-age=${time}`,
              ContentType: 'image/jpeg',
              Body: Buffer.from(url.replace('data:image/jpeg;base64,', ''), 'base64')
            }, (err, data) => {
              if (data && data.Location) {
                if (!req.query.browser)
                  res.json({src: data.Location});

                redisClient.set(key, data.Location);
              }
            });
          }
          else if (!req.query.browser)
            res.json({src: url});
        });
      };

      optimizer.start();
    })
    .catch(err => {
      console.log(err);
      res.status(500)
      res.end();
    })
  })
  .catch(err => {
    console.log(err);
    res.status(500)
    res.end();
  })
})