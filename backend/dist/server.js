"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const port = Number(process.env.PORT) || 3000;
(0, app_1.createApp)().listen(port, () => {
    console.log(`Server running on port ${port}`);
});
