const formFactor = process.env.ALNILAM_LHCI_FORM_FACTOR || "mobile";
if (!["mobile", "desktop"].includes(formFactor)) throw new Error("ALNILAM_LHCI_FORM_FACTOR must be mobile or desktop");

const nested = "http://127.0.0.1:4324/ALNILAM";
const root = "http://127.0.0.1:4323";
const routes = ["/", "/posts/", "/posts/cover-story/", "/tags/"];
const mobile = formFactor === "mobile";
const clsBudget = 0.1;

module.exports = {
  ci: {
    collect: {
      url: routes.flatMap((route) => [`${root}${route}`, `${nested}${route}`]),
      numberOfRuns: 3,
      chromePath: process.env.ALNILAM_CHROME_PATH,
      settings: {
        chromeFlags: "--headless --no-sandbox --disable-dev-shm-usage",
        formFactor,
        screenEmulation: {
          mobile,
          width: mobile ? 390 : 1440,
          height: mobile ? 844 : 900,
          deviceScaleFactor: 1,
          disabled: false,
        },
      },
    },
    assert: {
      assertions: {
        "cumulative-layout-shift": ["warn", { maxNumericValue: clsBudget }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 4000 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: `artifacts/lighthouse/${formFactor}`,
    },
  },
};
