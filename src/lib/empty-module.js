// Empty module — used as browser fallback for Node-only modules (fs, net, tls, etc.)
// Required by the 'telegram' (GramJS) package which imports Node modules internally.
// Next.js Turbopack/webpack resolveAlias points these Node modules here.
module.exports = {};
