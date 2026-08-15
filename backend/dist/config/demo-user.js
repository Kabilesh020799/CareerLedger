"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.firstConfiguredDemoUser = exports.configuredDemoUsers = void 0;
exports.parseConfiguredDemoUsers = parseConfiguredDemoUsers;
require("dotenv/config");
function configuredDemoUser(environment, suffix) {
    const username = environment[`DEMO_USER${suffix}_USERNAME`]?.trim().toLowerCase();
    const password = environment[`DEMO_USER${suffix}_PASSWORD`];
    const email = environment[`DEMO_USER${suffix}_EMAIL`]?.trim().toLowerCase();
    const name = environment[`DEMO_USER${suffix}_NAME`]?.trim();
    if (!username && !password && !email && !name)
        return null;
    if (!username || !password || !email) {
        throw new Error(`DEMO_USER${suffix}_USERNAME, DEMO_USER${suffix}_PASSWORD, and DEMO_USER${suffix}_EMAIL must be configured together`);
    }
    return { username, password, email, name: name || username };
}
function parseConfiguredDemoUsers(environment) {
    return [configuredDemoUser(environment, ""), configuredDemoUser(environment, "_2")].filter((user) => user !== null);
}
/** Demo identities configured entirely through the server environment. */
exports.configuredDemoUsers = parseConfiguredDemoUsers(process.env);
exports.firstConfiguredDemoUser = exports.configuredDemoUsers[0] ?? null;
