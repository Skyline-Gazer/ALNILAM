# Your ALNILAM Site

Edit `site/alnilam.config.yaml` to set your blog title and final public URL. Put
Markdown or MDX in `site/content/posts/`. Commit your changes, then run
`npm run build` with Git, Bash and Node.js 24. Publish `dist/`.

Connect this repository in Cloudflare Pages with build command `npm run build`
and output directory `dist`. Vercel and Netlify read their included config files.
For GitHub Pages, select **GitHub Actions** in Settings → Pages and run **Publish
blog to GitHub Pages** from Actions. Set `site.url` to the full project URL,
including the repository path when applicable.

`core.sha` pins the Core and its dependency lockfile. To update, commit a new
released Core SHA. To rebuild a rollback with your current content, commit the
previous SHA in `core.sha`. Keep an already checked artifact for an exact
rollback, especially if the Site uses Bangumi provider data.

See the [Site onboarding guide](https://github.com/Skyline-Gazer/ALNILAM/blob/dev/docs/SITE_ONBOARDING.md) for configuration and platform details.
