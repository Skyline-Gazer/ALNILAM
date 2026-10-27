module.exports = {
  ci: {
    collect: {
      url: ['http://127.0.0.1:4323/', 'http://127.0.0.1:4323/posts/', 'http://127.0.0.1:4323/posts/hello-alnilam/',
        'http://127.0.0.1:4324/ALNILAM/', 'http://127.0.0.1:4324/ALNILAM/posts/', 'http://127.0.0.1:4324/ALNILAM/posts/hello-alnilam/'],
      numberOfRuns: 3,
      settings: {chromeFlags: '--headless --no-sandbox --disable-dev-shm-usage'},
    },
    assert: {assertions: {'cumulative-layout-shift': ['warn', {maxNumericValue: 0.10}], 'largest-contentful-paint': ['warn', {maxNumericValue: 4000}]}},
    upload: {target: 'filesystem', outputDir: 'artifacts/lighthouse'},
  },
};
