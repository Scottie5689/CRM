// Entry point for Phusion Passenger (cPanel Application Manager), which looks for
// app.js in the application root. A dynamic import keeps this file loadable even
// when Passenger uses require(), since server/auth.js has a top-level await.
import('./server/index.js').catch((err) => {
  console.error(err);
  process.exit(1);
});
